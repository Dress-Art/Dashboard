import {NextRequest, NextResponse} from 'next/server'

/**
 * Proxy GET /api/orders/admin sur la marketplace DressArt.
 *
 * Pourquoi un proxy : la clé admin (`ADMIN_SECRET_KEY`) ne doit jamais
 * atteindre le navigateur. Le dashboard envoie depuis le client, on
 * intercepte ici et on rajoute le header d'auth côté serveur.
 */

const marketplaceUrl = (process.env.MARKETPLACE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const adminKey = process.env.ADMIN_SECRET_KEY ?? ''

const SELF_URLS = new Set(['http://localhost:3000', 'http://127.0.0.1:3000'])

export async function GET(request: NextRequest) {
    if (!process.env.MARKETPLACE_URL || SELF_URLS.has(marketplaceUrl)) {
        console.error(
            '[proxy /api/marketplace/orders] MARKETPLACE_URL non configuré ou pointe vers localhost (boucle).' +
                ' Définir MARKETPLACE_URL dans .env.local pour pointer vers le service marketplace réel.',
        )
        return NextResponse.json(
            {
                error: 'MARKETPLACE_URL_MISCONFIGURED',
                message:
                    'Le proxy marketplace n\'est pas configuré côté serveur. Vérifie MARKETPLACE_URL dans .env.local.',
            },
            {status: 503},
        )
    }

    if (!adminKey) {
        console.error('[proxy /api/marketplace/orders] ADMIN_SECRET_KEY manquante.')
        return NextResponse.json(
            {error: 'ADMIN_KEY_MISSING', message: 'ADMIN_SECRET_KEY non configurée côté serveur.'},
            {status: 503},
        )
    }

    const {searchParams} = new URL(request.url)
    const qs = searchParams.toString()
    const target = `${marketplaceUrl}/api/orders/admin${qs ? `?${qs}` : ''}`

    let res: Response
    try {
        res = await fetch(target, {
            headers: {'x-admin-key': adminKey},
            cache: 'no-store',
        })
    } catch (err) {
        console.error('[proxy /api/marketplace/orders] fetch failed:', err)
        return NextResponse.json(
            {
                error: 'MARKETPLACE_UNREACHABLE',
                target,
                message: 'Marketplace inaccessible. Vérifie qu\'elle tourne et que MARKETPLACE_URL est correct.',
            },
            {status: 502},
        )
    }

    // Lire le body en texte pour détecter HTML / corps vide / autre.
    const text = await res.text()
    const contentType = res.headers.get('content-type') ?? ''

    if (!contentType.includes('application/json')) {
        console.error(
            `[proxy /api/marketplace/orders] réponse non-JSON (${res.status}) depuis ${target}.` +
                ` content-type=${contentType}`,
        )
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
