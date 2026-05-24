'use server'

import {createSupabaseServerClient} from '@/lib/supabase/server'
import {createSupabaseServiceClient} from '@/lib/supabase/service'
import {getUserRole, isProfessionalRole} from '@/lib/roles'

export interface HomeStats {
    couturiers: number
    orders: number
    clients: number
    models: number
    measurements: number
    /** Sum total_amount des 30 derniers jours, hors cancelled. */
    revenue30d: number
    /** Livraisons en cours (assigned + picked_up + in_transit). */
    deliveriesInFlight: number
}

const EMPTY: HomeStats = {
    couturiers: 0,
    orders: 0,
    clients: 0,
    models: 0,
    measurements: 0,
    revenue30d: 0,
    deliveriesInFlight: 0,
}

export async function getHomeStatsAction(): Promise<
    | {success: true; data: HomeStats}
    | {success: false; error: string; data: HomeStats}
> {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) return {success: false, error: 'unauthorized', data: EMPTY}

    const role = getUserRole(user)
    if (!isProfessionalRole(role) || role !== 'admin') {
        return {success: false, error: 'forbidden', data: EMPTY}
    }

    const supabase = createSupabaseServiceClient()
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [
        usersRes,
        ordersHeadRes,
        recentOrdersRes,
        clientsHeadRes,
        modelsHeadRes,
        measurementsHeadRes,
        deliveriesInFlightRes,
    ] = await Promise.allSettled([
        supabase.auth.admin.listUsers({page: 1, perPage: 1000}),
        supabase.from('orders').select('id', {count: 'exact', head: true}),
        supabase.from('orders').select('total_amount, status').gte('created_at', since),
        supabase.from('clients').select('id', {count: 'exact', head: true}),
        supabase.from('modeles').select('id', {count: 'exact', head: true}),
        supabase.from('measurements').select('id', {count: 'exact', head: true}),
        supabase
            .from('deliveries')
            .select('id', {count: 'exact', head: true})
            .in('status', ['assigned', 'picked_up', 'in_transit']),
    ])

    const countOk = (res: PromiseSettledResult<{count: number | null; error: unknown}>): number =>
        res.status === 'fulfilled' && !res.value.error ? (res.value.count ?? 0) : 0

    const couturiers =
        usersRes.status === 'fulfilled' && !usersRes.value.error
            ? (usersRes.value.data?.users ?? []).filter(
                  u => ((u.app_metadata as {role?: string} | null)?.role ?? (u.user_metadata as {role?: string} | null)?.role) === 'couturier',
              ).length
            : 0

    const revenue30d =
        recentOrdersRes.status === 'fulfilled' && !recentOrdersRes.value.error
            ? (recentOrdersRes.value.data ?? [])
                  .filter((o: {status: string}) => o.status !== 'cancelled')
                  .reduce((sum: number, o: {total_amount: number | null}) => sum + (o.total_amount ?? 0), 0)
            : 0

    return {
        success: true,
        data: {
            couturiers,
            orders: countOk(ordersHeadRes),
            clients: countOk(clientsHeadRes),
            models: countOk(modelsHeadRes),
            measurements: countOk(measurementsHeadRes),
            revenue30d,
            deliveriesInFlight: countOk(deliveriesInFlightRes),
        },
    }
}
