import {NextRequest, NextResponse} from 'next/server'
import {randomUUID} from 'node:crypto'
import {z} from 'zod'
import {tassi} from '@/lib/tassi/client'
import {TassiApiError, describeTassiError} from '@/lib/tassi/errors'
import {
    buildShipmentPayloadFromOrder,
    ShipmentBuildError,
    type ClientDelivery,
    type CouturierShop,
    type OrderForBuild,
} from '@/services/shipments.service'
import {assertCanLaunchDelivery, getProSession, HttpError} from '@/lib/auth/guards'
import {createSupabaseServiceClient} from '@/lib/supabase/service'

/**
 * `POST /api/tassi/shipments` — création one-click.
 *
 * Spec §6.5. Body minimal : `{ orderId, notes? }`. Le serveur fait tout :
 *   1. Garde d'autorisation (rôle, ownership, confection terminée, anti-doublon)
 *   2. Récupère order + couturier (auth.users.app_metadata.shop) + client
 *      (depuis `clients` ou `auth.users` selon source de la commande)
 *   3. Construit le payload via le service
 *   4. POST /v1/shipments avec Idempotency-Key
 *   5. Persiste dans `tassi_shipments`
 *
 * Note schéma : la spec assume un `users.shop_*` flat. Notre Supabase stocke
 * ces infos dans `auth.users.app_metadata.shop` (jsonb). Le mapping est fait ici.
 */
export const runtime = 'nodejs'

const InputSchema = z.object({
    orderId: z.string().uuid(),
    notes: z.string().max(500).optional(),
})

interface AuthUserMetadataShop {
    name?: string
    phone?: string
    address_line1?: string
    address_city?: string
    address_zip?: string
    address_country?: string
}

export async function POST(req: NextRequest) {
    try {
        const session = await getProSession()
        const body = InputSchema.parse(await req.json())
        // Service role : la garde `assertCanLaunchDelivery` + `getProSession()`
        // valident l'identité et le rôle. Pour les lectures (orders, modeles,
        // auth.admin.getUserById) et l'insert (tassi_shipments), on bypass RLS.
        const supabase = createSupabaseServiceClient()

        // 1. Charger la commande (avec couturier_id, agent_id, confection)
        const {data: orderRow, error: orderErr} = await supabase
            .from('orders')
            .select(
                'id, user_id, customer_name, customer_phone, customer_email, location, specific_location, couturier_confection_completed_at, agent_id',
            )
            .eq('id', body.orderId)
            .maybeSingle()

        if (orderErr || !orderRow) {
            throw new HttpError(404, 'ORDER_NOT_FOUND')
        }

        // Notre `orders` n'a pas de `couturier_id` direct (cf. mémoire projet :
        // couturier implicite via modeles.professional_id). Pour le MVP Tassi
        // on fait la jointure ici.
        const {data: modelRow} = await supabase
            .from('orders')
            .select('model_id, modeles:model_id(professional_id)')
            .eq('id', body.orderId)
            .maybeSingle<{model_id: string | null; modeles: {professional_id: string} | null}>()

        const couturierId = modelRow?.modeles?.professional_id ?? null
        if (!couturierId) {
            throw new HttpError(409, 'NO_COUTURIER_LINKED')
        }

        const orderForGuard: OrderForBuild & {agent_id: string | null} = {
            id: orderRow.id,
            couturier_id: couturierId,
            agent_id: orderRow.agent_id ?? null,
            couturier_confection_completed_at: orderRow.couturier_confection_completed_at,
        }
        await assertCanLaunchDelivery(session, orderForGuard)

        // 2. Charger les profils couturier + client
        const {data: {user: couturierUser}, error: couturierErr} = await supabase.auth
            .admin.getUserById(couturierId)
        if (couturierErr || !couturierUser) {
            throw new HttpError(500, 'COUTURIER_LOAD_FAILED')
        }
        const shopMeta = (couturierUser.app_metadata as {shop?: AuthUserMetadataShop} | null)?.shop ?? {}
        const couturier: CouturierShop = {
            name: shopMeta.name ?? null,
            phone: shopMeta.phone ?? couturierUser.phone ?? null,
            address_line1: shopMeta.address_line1 ?? null,
            address_city: shopMeta.address_city ?? null,
            address_zip: shopMeta.address_zip ?? null,
            address_country: shopMeta.address_country ?? null,
        }

        // Le client : on privilégie les snapshots `orders.customer_*` (spec : snapshot
        // qui résiste aux modifs ultérieures). Pays depuis `orders.location` (à mapper).
        const client: ClientDelivery = {
            full_name: orderRow.customer_name,
            phone: orderRow.customer_phone,
            address_line1: orderRow.specific_location ?? orderRow.location ?? null,
            address_city: orderRow.location ?? null,
            address_zip: null,
            // Bénin par défaut (DressArt principalement local). À rendre paramétrable.
            address_country: 'BJ',
        }

        // 3. Construire le payload via le service
        const payload = buildShipmentPayloadFromOrder(orderForGuard, couturier, client, {
            notes: body.notes,
        })

        // 4. POST Tassi avec idempotency
        const idempotencyKey = randomUUID()
        const {data: shipment} = await tassi.shipments.create(payload, {idempotencyKey})

        // 5. Persister dans tassi_shipments
        const {error: insertErr} = await supabase.from('tassi_shipments').insert({
            tassi_id: shipment.id,
            client_reference: orderForGuard.id,
            order_id: orderForGuard.id,
            couturier_id: couturierId,
            agent_id: orderForGuard.agent_id,
            created_by_user_id: session.userId,
            created_by_role: session.role,
            tassi_status: shipment.status,
            tassi_status_history: [{status: shipment.status, at: new Date().toISOString()}],
            delivery_status: 'shipping_created',
            couturier_notes: body.notes ?? null,
            next_poll_at: new Date(Date.now() + 60_000).toISOString(),
            raw_payload: shipment as unknown as Record<string, unknown>,
        })

        if (insertErr) {
            console.error('[POST /api/tassi/shipments] insert failed', insertErr)
            // Tassi a déjà accepté l'idempotency key. Si l'insert local échoue,
            // remonter clairement pour permettre une retry humaine côté admin.
            return NextResponse.json(
                {
                    error: 'TASSI_OK_BUT_DB_FAILED',
                    tassi_id: shipment.id,
                    db_error: insertErr.message,
                },
                {status: 500},
            )
        }

        return NextResponse.json({data: shipment}, {status: 201})
    } catch (err) {
        if (err instanceof HttpError) {
            return NextResponse.json({error: err.code}, {status: err.status})
        }
        if (err instanceof ShipmentBuildError) {
            return NextResponse.json(
                {error: err.code, details: err.details ?? null},
                {status: 422},
            )
        }
        if (err instanceof TassiApiError) {
            return NextResponse.json(
                {error: 'TASSI_API_ERROR', message: describeTassiError(err)},
                {status: err.status >= 400 && err.status < 600 ? err.status : 502},
            )
        }
        if (err instanceof z.ZodError) {
            return NextResponse.json(
                {error: 'INVALID_BODY', issues: err.issues},
                {status: 400},
            )
        }
        console.error('[POST /api/tassi/shipments] unexpected', err)
        return NextResponse.json({error: 'INTERNAL_ERROR'}, {status: 500})
    }
}
