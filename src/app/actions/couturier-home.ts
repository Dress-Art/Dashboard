'use server'

import {createSupabaseServerClient} from '@/lib/supabase/server'
import {createSupabaseServiceClient} from '@/lib/supabase/service'
import {getUserRole, isProfessionalRole} from '@/lib/roles'
import type {OrderStatus} from '@/types/order.types'

export interface CouturierHomeStats {
    ordersInProgress: number
    ordersTotal: number
    revenue30d: number
    modelsCount: number
    clientsCount: number
    appointmentsUpcoming: number
    averageRating: number
    totalReviews: number
    isAcceptingOrders: boolean
}

export interface CouturierOrderRow {
    id: string
    orderNumber: string | null
    customerName: string
    modelName: string | null
    totalAmount: number
    status: OrderStatus
    createdAt: string
}

const EMPTY_STATS: CouturierHomeStats = {
    ordersInProgress: 0,
    ordersTotal: 0,
    revenue30d: 0,
    modelsCount: 0,
    clientsCount: 0,
    appointmentsUpcoming: 0,
    averageRating: 0,
    totalReviews: 0,
    isAcceptingOrders: true,
}

const TERMINAL_STATUSES: OrderStatus[] = ['delivered', 'cancelled']

export async function getCouturierHomeStatsAction(): Promise<
    | {success: true; stats: CouturierHomeStats}
    | {success: false; error: string; stats: CouturierHomeStats}
> {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) return {success: false, error: 'unauthorized', stats: EMPTY_STATS}
    const role = getUserRole(user)
    if (!isProfessionalRole(role)) return {success: false, error: 'forbidden', stats: EMPTY_STATS}

    const supabase = createSupabaseServiceClient()
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const horizon7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const nowIso = new Date().toISOString()

    // `modeles.professional_id` est FK vers `professional_profiles.id`, pas
    // vers `auth.users.id` — il faut donc résoudre l'id du profil pro avant
    // de compter les modèles.
    const {data: profileRow} = await supabase
        .from('professional_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
    const professionalProfileId = (profileRow?.id as string | undefined) ?? null

    const [
        ordersOwn,
        ordersRecent,
        modelsCountRes,
        appointmentsRes,
        profileRes,
    ] = await Promise.allSettled([
        supabase
            .from('orders')
            .select('id, status, total_amount, customer_phone')
            .eq('professional_id', user.id),
        supabase
            .from('orders')
            .select('total_amount, status')
            .eq('professional_id', user.id)
            .gte('created_at', since30),
        professionalProfileId
            ? supabase
                  .from('modeles')
                  .select('id', {count: 'exact', head: true})
                  .eq('professional_id', professionalProfileId)
            : Promise.resolve({count: 0, error: null, data: null}),
        supabase
            .from('orders')
            .select('id', {count: 'exact', head: true})
            .eq('professional_id', user.id)
            .gte('appointment_date', nowIso)
            .lte('appointment_date', horizon7),
        supabase
            .from('professional_profiles')
            .select('average_rating, total_reviews, is_accepting_orders')
            .eq('user_id', user.id)
            .maybeSingle(),
    ])

    const ownRows = ordersOwn.status === 'fulfilled' && !ordersOwn.value.error
        ? (ordersOwn.value.data ?? [])
        : []
    const recentRows = ordersRecent.status === 'fulfilled' && !ordersRecent.value.error
        ? (ordersRecent.value.data ?? [])
        : []
    const modelsCount = modelsCountRes.status === 'fulfilled' && !modelsCountRes.value.error
        ? (modelsCountRes.value.count ?? 0)
        : 0
    const appointmentsUpcoming = appointmentsRes.status === 'fulfilled' && !appointmentsRes.value.error
        ? (appointmentsRes.value.count ?? 0)
        : 0
    const profile = profileRes.status === 'fulfilled' && !profileRes.value.error
        ? profileRes.value.data
        : null

    const ordersInProgress = ownRows.filter(o => !TERMINAL_STATUSES.includes(o.status as OrderStatus)).length
    const revenue30d = recentRows
        .filter(o => o.status !== 'cancelled')
        .reduce((sum: number, o: {total_amount: number | null}) => sum + (o.total_amount ?? 0), 0)
    // Distinct clients : on agrège par customer_phone (le marketplace pousse les clients en orders.customer_*).
    const phones = new Set<string>()
    for (const o of ownRows) {
        if (o.customer_phone) phones.add(o.customer_phone as string)
    }

    return {
        success: true,
        stats: {
            ordersInProgress,
            ordersTotal: ownRows.length,
            revenue30d,
            modelsCount,
            clientsCount: phones.size,
            appointmentsUpcoming,
            averageRating: Number(profile?.average_rating ?? 0),
            totalReviews: Number(profile?.total_reviews ?? 0),
            isAcceptingOrders: Boolean(profile?.is_accepting_orders ?? true),
        },
    }
}

export async function listCouturierRecentOrdersAction(limit = 10): Promise<
    | {success: true; orders: CouturierOrderRow[]}
    | {success: false; error: string; orders: CouturierOrderRow[]}
> {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) return {success: false, error: 'unauthorized', orders: []}
    const role = getUserRole(user)
    if (!isProfessionalRole(role)) return {success: false, error: 'forbidden', orders: []}

    const supabase = createSupabaseServiceClient()
    const {data, error} = await supabase
        .from('orders')
        .select('id, order_number, customer_name, model_name, total_amount, status, created_at')
        .eq('professional_id', user.id)
        .order('created_at', {ascending: false})
        .limit(limit)

    if (error) return {success: false, error: error.message, orders: []}

    const orders: CouturierOrderRow[] = (data ?? []).map(row => ({
        id: row.id as string,
        orderNumber: (row.order_number as string | null) ?? null,
        customerName: (row.customer_name as string) ?? '',
        modelName: (row.model_name as string | null) ?? null,
        totalAmount: (row.total_amount as number) ?? 0,
        status: (row.status as OrderStatus) ?? 'confirmed',
        createdAt: row.created_at as string,
    }))

    return {success: true, orders}
}
