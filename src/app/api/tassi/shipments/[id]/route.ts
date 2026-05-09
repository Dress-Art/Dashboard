import {NextRequest, NextResponse} from 'next/server'
import {tassiAPI, TassiApiError} from '@/lib/tassi-api'
import {createSupabaseServerClient} from '@/lib/supabase/server'
import {getUserRole, isProfessionalRole} from '@/lib/roles'
import type {TassiPackage} from '@/types/tassi.types'

/**
 * Proxy GET vers un shipment Tassi via son `shipment_id` (format `shp_*`).
 *
 * Pourquoi un proxy : `tassiAPI` lit `TASSI_API_KEY` depuis `process.env`
 * — la clé ne doit JAMAIS atteindre le navigateur. Toute lecture Tassi
 * depuis l'UI passe donc par ce endpoint.
 *
 * Endpoint Tassi appelé : `/shipments/{id}` (vocabulaire documenté).
 * Fallback sur `/packages/{id}` si shipments renvoie 404 — le sondage live
 * a confirmé /packages comme route fonctionnelle, donc on est défensif le
 * temps que Tassi stabilise le vocabulaire.
 *
 * Auth : nécessite un user connecté avec un rôle professionnel
 * (admin/couturier/agent/livreur/vendeur).
 */
export const runtime = 'nodejs'

export async function GET(
    _req: NextRequest,
    {params}: {params: Promise<{id: string}>},
) {
    const {id} = await params
    if (!id) {
        return NextResponse.json({error: 'missing_id'}, {status: 400})
    }

    const supabase = await createSupabaseServerClient()
    const {
        data: {user},
    } = await supabase.auth.getUser()
    if (!user || !isProfessionalRole(getUserRole(user))) {
        return NextResponse.json({error: 'unauthorized'}, {status: 401})
    }

    try {
        const result = await tassiAPI.getShipment(id)
        return NextResponse.json(result, {
            status: 200,
            headers: {'Cache-Control': 'private, max-age=30'},
        })
    } catch (err) {
        // Fallback : /packages/{id} si /shipments retourne 404
        if (err instanceof TassiApiError && err.status === 404) {
            try {
                const fallback = (await tassiAPI.getPackage(id)) as {package: TassiPackage}
                return NextResponse.json(
                    {shipment: fallback.package},
                    {status: 200, headers: {'Cache-Control': 'private, max-age=30'}},
                )
            } catch (fallbackErr) {
                if (fallbackErr instanceof TassiApiError) {
                    const status =
                        fallbackErr.status >= 400 && fallbackErr.status < 600 ? fallbackErr.status : 502
                    return NextResponse.json({error: fallbackErr.message}, {status})
                }
            }
        }
        if (err instanceof TassiApiError) {
            const status = err.status >= 400 && err.status < 600 ? err.status : 502
            return NextResponse.json({error: err.message}, {status})
        }
        console.error('[tassi proxy] unexpected:', err)
        return NextResponse.json({error: 'tassi_fetch_failed'}, {status: 502})
    }
}
