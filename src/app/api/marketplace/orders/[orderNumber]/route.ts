import {NextRequest, NextResponse} from 'next/server'

/**
 * Proxy PATCH `/api/orders/{orderNumber}` sur la marketplace DressArt.
 * Mêmes garanties que `route.ts` parent : pas de crash sur réponse non-JSON,
 * détection misconfig MARKETPLACE_URL, log explicite.
 */

const marketplaceUrl = (process.env.MARKETPLACE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const adminKey = process.env.ADMIN_SECRET_KEY ?? ''

const SELF_URLS = new Set(['http://localhost:3000', 'http://127.0.0.1:3000'])

export async function PATCH(
    request: NextRequest,
    {params}: {params: Promise<{orderNumber: string}>},
) {
    const {orderNumber} = await params

    if (!process.env.MARKETPLACE_URL || SELF_URLS.has(marketplaceUrl)) {
        console.error(
            '[proxy /api/marketplace/orders/[orderNumber]] MARKETPLACE_URL non configuré ou auto-référent.',
        )
        return NextResponse.json(
            {error: 'MARKETPLACE_URL_MISCONFIGURED'},
            {status: 503},
        )
    }
    if (!adminKey) {
        return NextResponse.json({error: 'ADMIN_KEY_MISSING'}, {status: 503})
    }

    const body = await request.json()
    const target = `${marketplaceUrl}/api/orders/${orderNumber}`

    let res: Response
    try {
        res = await fetch(target, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': adminKey,
            },
            body: JSON.stringify(body),
        })
    } catch (err) {
        console.error('[proxy /api/marketplace/orders/[orderNumber]] fetch failed:', err)
        return NextResponse.json({error: 'MARKETPLACE_UNREACHABLE', target}, {status: 502})
    }

    const text = await res.text()
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
        return NextResponse.json(
            {
                error: 'MARKETPLACE_BAD_RESPONSE',
                upstream_status: res.status,
                content_type: contentType,
                target,
                preview: text.slice(0, 200),
            },
            {status: res.status >= 400 ? res.status : 502},
        )
    }
    let data: unknown
    try {
        data = JSON.parse(text)
    } catch {
        return NextResponse.json(
            {error: 'INVALID_JSON_FROM_MARKETPLACE', upstream_status: res.status, preview: text.slice(0, 200)},
            {status: 502},
        )
    }
    return NextResponse.json(data, {status: res.status})
}
