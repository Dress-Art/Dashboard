import {NextRequest, NextResponse} from 'next/server'
import {createHmac, timingSafeEqual} from 'node:crypto'
import {createSupabaseServerClient} from '@/lib/supabase/server'
import type {TassiWebhookEvent, TassiPackage, TassiPackageStatus} from '@/types/tassi.types'

/**
 * Webhook receiver Tassi.pro.
 *
 * Tassi appelle cette route quand le statut d'un `package` change. On met
 * à jour la `deliveries` correspondante (matchée via `tassi_package_id` ou
 * `tassi_tracking_number`).
 *
 * Sécurité :
 *   - HMAC-SHA256 du raw body avec `process.env.TASSI_WEBHOOK_SECRET`
 *     (clé `tassi_sec_mkp_*`). Comparaison timing-safe.
 *   - Header attendu : `X-Tassi-Signature` (peut contenir `sha256=<hex>` OU `<hex>` brut).
 *   - ⚠️ Le format exact (header name + algorithme) reste à confirmer avec la
 *     doc Tassi. On accepte plusieurs formats courants par défensif.
 *
 * Mapping des status Tassi → DressArt deliveries.status :
 *   pending     → pending
 *   assigned    → assigned
 *   picked_up   → picked_up
 *   in_transit  → in_transit
 *   delivered   → delivered
 *   cancelled   → cancelled
 *   returned    → cancelled (pas de status dédié côté DressArt pour l'instant)
 */

// Force Node runtime pour avoir `node:crypto` (HMAC + timingSafeEqual)
export const runtime = 'nodejs'

/**
 * Vérifie la signature HMAC-SHA256 du raw body.
 * Renvoie true si valide. Tolère les formats `sha256=<hex>` ou `<hex>` direct.
 */
function verifyTassiSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
    if (!signatureHeader || !secret) return false
    // Strip prefix éventuel (`sha256=...`)
    const provided = signatureHeader.replace(/^sha256=/, '').trim()
    if (provided.length === 0) return false

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')

    // timingSafeEqual nécessite des Buffers de même longueur
    const a = Buffer.from(provided, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
}

const STATUS_MAP: Record<TassiPackageStatus, string> = {
    pending: 'pending',
    assigned: 'assigned',
    picked_up: 'picked_up',
    in_transit: 'in_transit',
    delivered: 'delivered',
    cancelled: 'cancelled',
    returned: 'cancelled',
}

export async function POST(request: NextRequest) {
    // 1. Lire le raw body (nécessaire pour HMAC — JSON.parse ne suffit pas)
    const rawBody = await request.text()

    // 2. Vérifier signature
    const secret = process.env.TASSI_WEBHOOK_SECRET
    if (!secret) {
        console.error('[tassi-webhook] TASSI_WEBHOOK_SECRET non configuré')
        return NextResponse.json({error: 'webhook_not_configured'}, {status: 500})
    }
    const signature =
        request.headers.get('x-tassi-signature') ??
        request.headers.get('tassi-signature') ??
        request.headers.get('x-signature')
    if (!verifyTassiSignature(rawBody, signature, secret)) {
        console.warn('[tassi-webhook] signature invalide', {
            has_header: Boolean(signature),
            ip: request.headers.get('x-forwarded-for') ?? 'unknown',
        })
        return NextResponse.json({error: 'invalid_signature'}, {status: 401})
    }

    // 3. Parser le body après validation
    let event: TassiWebhookEvent<TassiPackage>
    try {
        event = JSON.parse(rawBody) as TassiWebhookEvent<TassiPackage>
    } catch {
        return NextResponse.json({error: 'invalid_json'}, {status: 400})
    }

    if (!event.event || !event.data) {
        return NextResponse.json({error: 'malformed_event'}, {status: 400})
    }

    const pkg = event.data
    const newStatus = STATUS_MAP[pkg.status]
    if (!newStatus) {
        return NextResponse.json({error: 'unknown_status', status: pkg.status}, {status: 400})
    }

    const supabase = await createSupabaseServerClient()

    // Match priority : tassi_package_id, sinon tracking_number, sinon external_id
    const matchClauses: Array<{column: string; value: string | number}> = []
    if (pkg.id) matchClauses.push({column: 'tassi_package_id', value: pkg.id})
    if (pkg.tracking_number) matchClauses.push({column: 'tassi_tracking_number', value: pkg.tracking_number})

    let updated = null
    let lastError = null
    for (const clause of matchClauses) {
        const {data, error} = await supabase
            .from('deliveries')
            .update({
                status: newStatus,
                tassi_package_id: pkg.id,
                tassi_tracking_number: pkg.tracking_number ?? null,
                tassi_payload: pkg as unknown as Record<string, unknown>,
                ...(newStatus === 'delivered' ? {actual_delivery_time: new Date().toISOString()} : {}),
            })
            .eq(clause.column, clause.value)
            .select()
        if (error) {
            lastError = error
            continue
        }
        if (data && data.length > 0) {
            updated = data[0]
            break
        }
    }

    if (!updated) {
        // Pas de match — on log mais on renvoie 200 pour que Tassi ne retry pas indéfiniment.
        console.warn('[tassi-webhook] no delivery matched', {
            event: event.event,
            package_id: pkg.id,
            tracking: pkg.tracking_number,
            error: lastError?.message,
        })
        return NextResponse.json({status: 'ignored', reason: 'no_matching_delivery'}, {status: 200})
    }

    return NextResponse.json({status: 'ok', delivery_id: updated.id}, {status: 200})
}
