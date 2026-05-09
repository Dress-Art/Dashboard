import {NextRequest, NextResponse} from 'next/server'
import {tassiAPI, TassiApiError} from '@/lib/tassi-api'
import {createSupabaseServerClient} from '@/lib/supabase/server'
import {getUserRole, isProfessionalRole} from '@/lib/roles'
import type {TassiCarrier, TassiPickupPoint, TassiMarketplace} from '@/types/tassi.types'

/**
 * GET /api/tassi/me
 *
 * Bundle de récupération côté admin pour la page de config Tassi :
 *   - marketplace (KYC, counters, identité)
 *   - pickup_points
 *   - carriers
 *
 * Fait 3 fetches Tassi en parallèle. Si l'un échoue, on renvoie quand même
 * les autres + un champ `errors[]`.
 *
 * Auth : admin uniquement (config plateforme).
 */
export const runtime = 'nodejs'

export async function GET(_req: NextRequest) {
    const supabase = await createSupabaseServerClient()
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({error: 'unauthorized'}, {status: 401})
    }
    const role = getUserRole(user)
    if (role !== 'admin' || !isProfessionalRole(role)) {
        return NextResponse.json({error: 'forbidden'}, {status: 403})
    }

    const errors: Array<{section: string; message: string; status?: number}> = []

    const [meRes, pickupsRes, carriersRes] = await Promise.allSettled([
        tassiAPI.getMe(),
        tassiAPI.listPickupPoints(),
        tassiAPI.listCarriers(),
    ])

    let marketplace: TassiMarketplace | null = null
    if (meRes.status === 'fulfilled') {
        marketplace = meRes.value.marketplace
    } else {
        const err = meRes.reason
        errors.push({
            section: 'marketplace',
            message: err instanceof TassiApiError ? err.message : String(err),
            status: err instanceof TassiApiError ? err.status : undefined,
        })
    }

    let pickup_points: TassiPickupPoint[] = []
    if (pickupsRes.status === 'fulfilled') {
        const list = pickupsRes.value as unknown as {pickup_points?: TassiPickupPoint[]}
        pickup_points = list.pickup_points ?? []
    } else {
        const err = pickupsRes.reason
        errors.push({
            section: 'pickup_points',
            message: err instanceof TassiApiError ? err.message : String(err),
            status: err instanceof TassiApiError ? err.status : undefined,
        })
    }

    let carriers: TassiCarrier[] = []
    if (carriersRes.status === 'fulfilled') {
        const list = carriersRes.value as unknown as {carriers?: TassiCarrier[]}
        carriers = list.carriers ?? []
    } else {
        const err = carriersRes.reason
        errors.push({
            section: 'carriers',
            message: err instanceof TassiApiError ? err.message : String(err),
            status: err instanceof TassiApiError ? err.status : undefined,
        })
    }

    return NextResponse.json(
        {marketplace, pickup_points, carriers, errors},
        {status: 200, headers: {'Cache-Control': 'private, max-age=60'}},
    )
}
