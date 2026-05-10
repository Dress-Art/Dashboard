import {NextRequest, NextResponse} from 'next/server'
import {tassi} from '@/lib/tassi/client'
import {TassiApiError, describeTassiError} from '@/lib/tassi/errors'
import {computeNextPollDelay, isTerminal, mapToDeliveryStatus, type DeliveryStatus} from '@/lib/tassi/poll-status'
import {createSupabaseServerClient} from '@/lib/supabase/server'
import {getProSession, HttpError} from '@/lib/auth/guards'

/**
 * `GET /api/tassi/shipments/[id]` — détail d'un shipment.
 *
 * Spec §8.2 : refresh opportuniste si `last_polled_at` > 2 min.
 * On lit la ligne locale, et si stale, on requeste Tassi pour rafraîchir
 * `tassi_status` + `delivery_status` + history.
 *
 * `[id]` = `tassi_shipments.tassi_id` (l'identifiant Tassi, pas notre PK).
 */
export const runtime = 'nodejs'

const STALE_THRESHOLD_MS = 2 * 60_000

interface ShipmentRow {
    id: string
    tassi_id: string
    order_id: string
    tassi_status: string
    delivery_status: DeliveryStatus
    tassi_status_history: Array<{status: string; at: string}>
    last_polled_at: string | null
    is_terminal: boolean
}

export async function GET(
    _req: NextRequest,
    {params}: {params: Promise<{id: string}>},
) {
    try {
        await getProSession()
        const {id: tassiId} = await params

        const supabase = await createSupabaseServerClient()
        const {data: row, error} = await supabase
            .from('tassi_shipments')
            .select(
                'id, tassi_id, order_id, tassi_status, delivery_status, tassi_status_history, last_polled_at, is_terminal',
            )
            .eq('tassi_id', tassiId)
            .maybeSingle<ShipmentRow>()

        if (error || !row) {
            throw new HttpError(404, 'SHIPMENT_NOT_FOUND')
        }

        // Refresh opportuniste si stale et non terminal
        const lastPolledMs = row.last_polled_at ? new Date(row.last_polled_at).getTime() : 0
        const stale = !row.is_terminal && Date.now() - lastPolledMs > STALE_THRESHOLD_MS

        let updatedRow = row
        if (stale) {
            try {
                const {data: shipment} = await tassi.shipments.retrieve(tassiId)
                const newDeliveryStatus = mapToDeliveryStatus(shipment.status, row.delivery_status)
                const becomeTerminal = isTerminal(shipment.status)
                const nextPollAt = becomeTerminal
                    ? null
                    : new Date(Date.now() + computeNextPollDelay(shipment.status)).toISOString()

                const newHistoryEntry =
                    row.tassi_status === shipment.status
                        ? row.tassi_status_history
                        : [...row.tassi_status_history, {status: shipment.status, at: new Date().toISOString()}]

                const updates: Record<string, unknown> = {
                    tassi_status: shipment.status,
                    tassi_status_history: newHistoryEntry,
                    delivery_status: newDeliveryStatus,
                    last_polled_at: new Date().toISOString(),
                    is_terminal: becomeTerminal,
                    raw_payload: shipment as unknown as Record<string, unknown>,
                }
                if (shipment.tracking_url) updates.tracking_url = shipment.tracking_url
                if (shipment.label_url) updates.label_url = shipment.label_url
                if (shipment.carrier_code) updates.carrier_code = shipment.carrier_code
                if (nextPollAt) updates.next_poll_at = nextPollAt
                if (shipment.status === 'delivered') {
                    updates.tassi_delivered_at = new Date().toISOString()
                    // 3 jours de validation tacite (spec §5.3)
                    const days = Number(process.env.DELIVERY_TACIT_CONFIRMATION_DAYS ?? 3)
                    updates.tacit_confirm_due_at = new Date(
                        Date.now() + days * 24 * 60 * 60_000,
                    ).toISOString()
                }

                const {data: updated} = await supabase
                    .from('tassi_shipments')
                    .update(updates)
                    .eq('id', row.id)
                    .select(
                        'id, tassi_id, order_id, tassi_status, delivery_status, tassi_status_history, last_polled_at, is_terminal',
                    )
                    .single<ShipmentRow>()
                if (updated) updatedRow = updated
            } catch (refreshErr) {
                // On loggue mais on retourne quand même l'état local
                console.warn('[GET shipment] refresh failed', describeTassiError(refreshErr))
            }
        }

        return NextResponse.json(
            {data: updatedRow, refreshed: stale},
            {status: 200, headers: {'Cache-Control': 'private, max-age=30'}},
        )
    } catch (err) {
        if (err instanceof HttpError) {
            return NextResponse.json({error: err.code}, {status: err.status})
        }
        if (err instanceof TassiApiError) {
            return NextResponse.json(
                {error: 'TASSI_API_ERROR', message: describeTassiError(err)},
                {status: err.status >= 400 && err.status < 600 ? err.status : 502},
            )
        }
        console.error('[GET shipment] unexpected', err)
        return NextResponse.json({error: 'INTERNAL_ERROR'}, {status: 500})
    }
}
