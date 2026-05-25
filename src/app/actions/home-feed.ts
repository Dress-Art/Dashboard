'use server'

import {createSupabaseServerClient} from '@/lib/supabase/server'
import {createSupabaseServiceClient} from '@/lib/supabase/service'
import {getUserRole, isProfessionalRole} from '@/lib/roles'
import type {OrderStatus} from '@/types/order.types'
import type {DeliveryStatus, DeliveryPriority} from '@/types/delivery.types'

export interface RecentOrderRow {
    id: string
    orderNumber: string | null
    customerName: string
    modelName: string | null
    totalAmount: number
    status: OrderStatus
    createdAt: string
}

export interface RecentDeliveryRow {
    id: string
    orderId: string
    customerName: string
    customerAddress: string
    driverId: string | null
    driverName: string | null
    status: DeliveryStatus
    priority: DeliveryPriority
    createdAt: string
}

async function gateAdmin(): Promise<{ok: true} | {ok: false; error: 'unauthorized' | 'forbidden'}> {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) return {ok: false, error: 'unauthorized'}
    const role = getUserRole(user)
    if (!isProfessionalRole(role) || role !== 'admin') return {ok: false, error: 'forbidden'}
    return {ok: true}
}

export async function listRecentOrdersAction(limit = 10): Promise<
    | {success: true; orders: RecentOrderRow[]}
    | {success: false; error: string; orders: RecentOrderRow[]}
> {
    const gate = await gateAdmin()
    if (!gate.ok) return {success: false, error: gate.error, orders: []}

    const supabase = createSupabaseServiceClient()
    const {data, error} = await supabase
        .from('orders')
        .select('id, order_number, customer_name, model_name, total_amount, status, created_at')
        .order('created_at', {ascending: false})
        .limit(limit)

    if (error) return {success: false, error: error.message, orders: []}

    const orders: RecentOrderRow[] = (data ?? []).map(row => ({
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

export async function listRecentDeliveriesAction(limit = 10): Promise<
    | {success: true; deliveries: RecentDeliveryRow[]}
    | {success: false; error: string; deliveries: RecentDeliveryRow[]}
> {
    const gate = await gateAdmin()
    if (!gate.ok) return {success: false, error: gate.error, deliveries: []}

    const supabase = createSupabaseServiceClient()
    const {data, error} = await supabase
        .from('deliveries')
        .select('id, order_id, customer_name, customer_address, driver_id, status, priority, created_at')
        .order('created_at', {ascending: false})
        .limit(limit)

    if (error) return {success: false, error: error.message, deliveries: []}

    // Résolution des noms des livreurs en un seul appel admin (les uuid distincts uniquement).
    const driverIds = [...new Set((data ?? []).map(r => r.driver_id).filter(Boolean) as string[])]
    const driverNames = new Map<string, string>()
    if (driverIds.length > 0) {
        const {data: usersRes} = await supabase.auth.admin.listUsers({page: 1, perPage: 1000})
        for (const u of usersRes?.users ?? []) {
            if (driverIds.includes(u.id)) {
                const name = (u.user_metadata as {name?: string} | null)?.name ?? u.email ?? u.phone ?? u.id
                driverNames.set(u.id, name)
            }
        }
    }

    const deliveries: RecentDeliveryRow[] = (data ?? []).map(row => ({
        id: row.id as string,
        orderId: row.order_id as string,
        customerName: (row.customer_name as string) ?? '',
        customerAddress: (row.customer_address as string) ?? '',
        driverId: (row.driver_id as string | null) ?? null,
        driverName: row.driver_id ? driverNames.get(row.driver_id as string) ?? null : null,
        status: (row.status as DeliveryStatus) ?? 'pending',
        priority: (row.priority as DeliveryPriority) ?? 'normal',
        createdAt: row.created_at as string,
    }))

    return {success: true, deliveries}
}
