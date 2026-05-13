'use server'

import {createSupabaseServerClient} from '@/lib/supabase/server'
import {createSupabaseServiceClient} from '@/lib/supabase/service'
import {getUserRole, isProfessionalRole} from '@/lib/roles'
import {notifyDeliveryAssigned, notifyDeliveryStatusChanged} from '@/lib/notifications/deliveries'
import type {DeliveryPriority, DeliveryStatus} from '@/types/delivery.types'
import type {DeliveryRow} from '@/lib/deliveries-api'

async function getCurrentProfessionalUser() {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) return {success: false as const, error: 'unauthorized' as const}

    const role = getUserRole(user)
    if (!isProfessionalRole(role)) return {success: false as const, error: 'forbidden' as const}

    return {success: true as const, user, role}
}

async function loadDelivery(id: string): Promise<DeliveryRow | null> {
    const supabase = createSupabaseServiceClient()
    const {data, error} = await supabase
        .from('deliveries')
        .select('*')
        .eq('id', id)
        .maybeSingle()

    if (error) throw error
    return (data as DeliveryRow | null) ?? null
}

async function loadDeliveryByOrderId(orderId: string): Promise<DeliveryRow | null> {
    const supabase = createSupabaseServiceClient()
    const {data, error} = await supabase
        .from('deliveries')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle()

    if (error) throw error
    return (data as DeliveryRow | null) ?? null
}

async function loadOrder(id: string): Promise<{
    id: string
    customer_name: string
    customer_phone: string | null
    location: string | null
    specific_location: string | null
    status: string
} | null> {
    const supabase = createSupabaseServiceClient()
    const {data, error} = await supabase
        .from('orders')
        .select('id, customer_name, customer_phone, location, specific_location, status')
        .eq('id', id)
        .maybeSingle()

    if (error) throw error
    return data as {
        id: string
        customer_name: string
        customer_phone: string | null
        location: string | null
        specific_location: string | null
        status: string
    } | null
}

async function canEditDelivery(userId: string, role: ReturnType<typeof getUserRole>, delivery: DeliveryRow) {
    if (role === 'admin') return true
    return role === 'livreur' && delivery.driver_id === userId
}

export async function assignDeliveryAction(input: {
    deliveryId: string
    driverId: string
    priority?: DeliveryPriority
    estimatedTime?: string | null
    driverPhone?: string | null
    driverName?: string | null
}) {
    const auth = await getCurrentProfessionalUser()
    if (!auth.success) return {success: false, error: auth.error}
    if (auth.role !== 'admin') return {success: false, error: 'forbidden'}

    const supabase = createSupabaseServiceClient()
    const {data, error} = await supabase
        .from('deliveries')
        .update({
            driver_id: input.driverId,
            priority: input.priority ?? 'normal',
            estimated_time: input.estimatedTime ?? null,
            status: 'assigned',
            assigned_at: new Date().toISOString(),
        })
        .eq('id', input.deliveryId)
        .select('*')
        .single()

    if (error) return {success: false, error: error.message}

    const delivery = data as DeliveryRow
    void notifyDeliveryAssigned({delivery, driverPhone: input.driverPhone, driverName: input.driverName})
    return {success: true as const, delivery}
}

export async function updateDeliveryStatusAction(input: {
    deliveryId: string
    status: DeliveryStatus
    proofUrl?: string | null
    signedByName?: string | null
}) {
    const auth = await getCurrentProfessionalUser()
    if (!auth.success) return {success: false, error: auth.error}

    const current = await loadDelivery(input.deliveryId)
    if (!current) return {success: false, error: 'not_found'}
    if (!(await canEditDelivery(auth.user.id, auth.role, current))) return {success: false, error: 'forbidden'}

    const patch: Record<string, unknown> = {status: input.status}
    if (input.status === 'delivered') {
        patch.actual_delivery_time = new Date().toISOString()
        patch.signed_at = new Date().toISOString()
    }
    if (input.proofUrl) patch.proof_url = input.proofUrl
    if (input.signedByName) patch.signed_by_name = input.signedByName

    const supabase = createSupabaseServiceClient()
    const {data, error} = await supabase
        .from('deliveries')
        .update(patch)
        .eq('id', input.deliveryId)
        .select('*')
        .single()

    if (error) return {success: false, error: error.message}

    const delivery = data as DeliveryRow
    void notifyDeliveryStatusChanged({delivery, status: input.status})
    return {success: true as const, delivery}
}

export async function createDeliveryFromOrderAction(input: {
    orderId: string
}) {
    const auth = await getCurrentProfessionalUser()
    if (!auth.success) return {success: false, error: auth.error}
    if (auth.role !== 'admin') return {success: false, error: 'forbidden'}

    const [existingDelivery, order] = await Promise.all([
        loadDeliveryByOrderId(input.orderId),
        loadOrder(input.orderId),
    ])

    if (existingDelivery) {
        return {success: true as const, delivery: existingDelivery, created: false}
    }

    if (!order) {
        return {success: false, error: 'order_not_found'}
    }

    const supabase = createSupabaseServiceClient()
    const {data, error} = await supabase
        .from('deliveries')
        .insert({
            order_id: order.id,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            customer_address: order.specific_location ?? order.location ?? 'Adresse à préciser',
            status: 'pending',
            priority: 'normal',
        })
        .select('*')
        .single()

    if (error) return {success: false, error: error.message}

    return {success: true as const, delivery: data as DeliveryRow, created: true}
}
