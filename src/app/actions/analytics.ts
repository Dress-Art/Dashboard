'use server'

import {createSupabaseServerClient} from '@/lib/supabase/server'
import {createSupabaseServiceClient} from '@/lib/supabase/service'
import {getUserRole, isProfessionalRole} from '@/lib/roles'

interface OrderRow {
    id: string
    status: string
    total_amount: number | null
    paid_amount: number | null
    professional_id: string | null
    created_at: string
}

interface DeliveryRow {
    id: string
    status: string
    created_at: string
}

export interface AdminAnalytics {
    /** Somme des total_amount sur les 30 derniers jours, hors cancelled. */
    revenue30d: number
    /** Somme paid_amount toutes périodes. */
    cashed: number
    orders30d: number
    ordersTotal: number
    deliveries30d: number
    /** Pourcentage de delivered / (delivered + cancelled + failed) sur 30 jours. */
    deliverySuccessRate30d: number
    ordersByStatus: Record<string, number>
    topCouturiers: Array<{userId: string; name: string; ordersCount: number}>
}

const EMPTY: AdminAnalytics = {
    revenue30d: 0,
    cashed: 0,
    orders30d: 0,
    ordersTotal: 0,
    deliveries30d: 0,
    deliverySuccessRate30d: 0,
    ordersByStatus: {},
    topCouturiers: [],
}

export async function getAdminAnalyticsAction(): Promise<
    | {success: true; data: AdminAnalytics}
    | {success: false; error: string; data: AdminAnalytics}
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

    const [ordersRes, ordersRecentRes, deliveriesRecentRes, usersRes] = await Promise.allSettled([
        supabase.from('orders').select('id, status, total_amount, paid_amount, professional_id, created_at'),
        supabase.from('orders').select('id, status, total_amount, paid_amount, professional_id, created_at').gte('created_at', since),
        supabase.from('deliveries').select('id, status, created_at').gte('created_at', since),
        supabase.auth.admin.listUsers({page: 1, perPage: 1000}),
    ])

    const allOrders: OrderRow[] = ordersRes.status === 'fulfilled' && !ordersRes.value.error
        ? (ordersRes.value.data as OrderRow[]) ?? []
        : []
    const recentOrders: OrderRow[] = ordersRecentRes.status === 'fulfilled' && !ordersRecentRes.value.error
        ? (ordersRecentRes.value.data as OrderRow[]) ?? []
        : []
    const recentDeliveries: DeliveryRow[] = deliveriesRecentRes.status === 'fulfilled' && !deliveriesRecentRes.value.error
        ? (deliveriesRecentRes.value.data as DeliveryRow[]) ?? []
        : []
    const users = usersRes.status === 'fulfilled' && !usersRes.value.error
        ? usersRes.value.data?.users ?? []
        : []

    const userNames = new Map<string, string>()
    for (const u of users) {
        const name = (u.user_metadata as {name?: string} | null)?.name ?? u.email ?? u.id
        userNames.set(u.id, name)
    }

    const revenue30d = recentOrders
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + (o.total_amount ?? 0), 0)

    const cashed = allOrders.reduce((sum, o) => sum + (o.paid_amount ?? 0), 0)

    const ordersByStatus: Record<string, number> = {}
    for (const o of allOrders) {
        ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1
    }

    const orderCountByCouturier = new Map<string, number>()
    for (const o of allOrders) {
        if (!o.professional_id) continue
        orderCountByCouturier.set(o.professional_id, (orderCountByCouturier.get(o.professional_id) ?? 0) + 1)
    }
    const topCouturiers = [...orderCountByCouturier.entries()]
        .map(([userId, ordersCount]) => ({userId, ordersCount, name: userNames.get(userId) ?? 'Couturier'}))
        .sort((a, b) => b.ordersCount - a.ordersCount)
        .slice(0, 5)

    // Taux de succès = delivered / (delivered + cancelled + failed). Le statut
    // `failed` n'est pas (encore) dans le check constraint mais on l'anticipe.
    const deliveryFinal = recentDeliveries.filter(d => ['delivered', 'cancelled', 'failed'].includes(d.status))
    const deliveryDelivered = deliveryFinal.filter(d => d.status === 'delivered').length
    const deliverySuccessRate30d = deliveryFinal.length === 0 ? 0 : Math.round((deliveryDelivered / deliveryFinal.length) * 100)

    return {
        success: true,
        data: {
            revenue30d,
            cashed,
            orders30d: recentOrders.length,
            ordersTotal: allOrders.length,
            deliveries30d: recentDeliveries.length,
            deliverySuccessRate30d,
            ordersByStatus,
            topCouturiers,
        },
    }
}
