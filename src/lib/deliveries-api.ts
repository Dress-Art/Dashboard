import {supabase} from './supabase'

/**
 * Client deliveries — appelle directement Supabase JS (RLS opérationnelle).
 * Remplace les méthodes `adminAPI.assignDelivery / updateDeliveryStatus /
 * getDeliveries` qui pointaient vers des Edge Functions inexistantes.
 *
 * RLS (cf. migration 20260429_deliveries.sql) :
 *   - SELECT : admin OU livreur assigné
 *   - INSERT : admin (généralement via trigger auto-delivery)
 *   - UPDATE : admin OU livreur (transitions forward sur ses propres livraisons)
 *   - DELETE : admin uniquement
 */

import type {DeliveryStatus, DeliveryPriority} from '@/types/delivery.types'

export interface DeliveryRow {
    id: string
    order_id: string
    driver_id: string | null
    customer_name: string
    customer_phone: string | null
    customer_address: string
    status: DeliveryStatus
    priority: DeliveryPriority
    estimated_time: string | null
    actual_delivery_time: string | null
    notes: string | null
    tracking_info: Record<string, unknown> | null
    tracking_token: string
    proof_url: string | null
    signed_at: string | null
    signed_by_name: string | null
    assigned_at: string | null
    created_at: string
    updated_at: string
}

interface ListParams {
    /** Filtre serveur sur customer_name (ilike). */
    search?: string
    /** Filtre serveur sur status (exact). */
    status?: DeliveryStatus | 'all'
    /** Limite par défaut 100. */
    limit?: number
    /** Si fourni, ne renvoie que les deliveries de ce livreur (page /me/deliveries). */
    driverId?: string
}

export async function listDeliveries(params: ListParams = {}): Promise<{
    deliveries: DeliveryRow[]
    total: number
}> {
    let q = supabase
        .from('deliveries')
        .select('*', {count: 'exact'})
        .order('created_at', {ascending: false})
        .limit(params.limit ?? 100)

    if (params.search?.trim()) q = q.ilike('customer_name', `%${params.search.trim()}%`)
    if (params.status && params.status !== 'all') q = q.eq('status', params.status)
    if (params.driverId) q = q.eq('driver_id', params.driverId)

    const {data, count, error} = await q
    if (error) throw error
    return {deliveries: (data ?? []) as DeliveryRow[], total: count ?? 0}
}

export async function getDelivery(id: string): Promise<DeliveryRow> {
    const {data, error} = await supabase
        .from('deliveries')
        .select('*')
        .eq('id', id)
        .single()
    if (error) throw error
    return data as DeliveryRow
}

/**
 * Assigne une livraison à un livreur. Passage automatique pending → assigned.
 * Admin uniquement (cf. RLS UPDATE).
 */
export async function assignDelivery(
    id: string,
    input: {
        driverId: string
        priority?: DeliveryPriority
        estimatedTime?: string | null
    },
): Promise<DeliveryRow> {
    const patch: Partial<DeliveryRow> = {
        driver_id: input.driverId,
        priority: input.priority ?? 'normal',
        estimated_time: input.estimatedTime ?? null,
        status: 'assigned',
        assigned_at: new Date().toISOString(),
    }
    const {data, error} = await supabase
        .from('deliveries')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
    if (error) throw error
    return data as DeliveryRow
}

/**
 * Transition de statut. RLS autorise admin OU livreur assigné (cas livreur
 * limité aux transitions forward grâce au CHECK status IN clause de la policy).
 */
export async function updateDeliveryStatus(
    id: string,
    status: DeliveryStatus,
    extras: {
        proof_url?: string
        signed_by_name?: string
    } = {},
): Promise<DeliveryRow> {
    const patch: Partial<DeliveryRow> = {status}
    if (status === 'delivered') {
        patch.actual_delivery_time = new Date().toISOString()
        patch.signed_at = patch.signed_at ?? new Date().toISOString()
    }
    if (extras.proof_url) patch.proof_url = extras.proof_url
    if (extras.signed_by_name) patch.signed_by_name = extras.signed_by_name

    const {data, error} = await supabase
        .from('deliveries')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
    if (error) throw error
    return data as DeliveryRow
}

/**
 * Construit le lien public de tracking pour un client final.
 * Pattern configurable via `NEXT_PUBLIC_TRACKING_URL_PATTERN` (default :
 * https://www.dressart.studio/track/{token}).
 */
export function buildTrackingUrl(trackingToken: string): string {
    const pattern =
        process.env.NEXT_PUBLIC_TRACKING_URL_PATTERN ??
        'https://www.dressart.studio/track/{token}'
    return pattern.replace('{token}', trackingToken)
}
