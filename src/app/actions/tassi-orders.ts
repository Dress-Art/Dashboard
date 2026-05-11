'use server'

import {createSupabaseServerClient} from '@/lib/supabase/server'
import {createSupabaseServiceClient} from '@/lib/supabase/service'
import {getUserRole, isProfessionalRole, type Role} from '@/lib/roles'
import {collectMissingFields, type ClientDelivery, type CouturierShop} from '@/services/shipments.service'
import type {DeliveryStatus} from '@/lib/tassi/poll-status'
import type {TassiShipmentStatus} from '@/lib/tassi/types'

/**
 * Server actions auxiliaires pour le flow Tassi côté UI :
 *   - markConfectionCompleted : pose `orders.couturier_confection_completed_at = now()`
 *   - getOrderTassiContext    : tout ce qu'il faut pour afficher la modale livraison
 *                               (flags can_launch, missing_fields, shipment éventuel)
 *
 * Les routes Tassi (`POST /api/tassi/shipments`) restent les seuls points qui
 * parlent à Tassi — ces actions ne touchent qu'à notre Supabase.
 */

export interface OrderTassiContext {
    success: boolean
    error?: string
    /** Si true, l'utilisateur courant a le droit d'agir sur cette commande. */
    can_launch: boolean
    confection_completed_at: string | null
    missing_fields: string[]
    couturier_id: string | null
    /** Shipment Tassi déjà créé pour cette commande (ou null). */
    shipment: {
        id: string
        tassi_id: string
        tassi_status: TassiShipmentStatus
        delivery_status: DeliveryStatus
        tracking_url: string | null
        label_url: string | null
        carrier_code: string | null
        couturier_notes: string | null
        created_at: string
    } | null
}

interface AuthShop {
    name?: string
    phone?: string
    address_line1?: string
    address_city?: string
    address_zip?: string
    address_country?: string
}

/**
 * Récupère tout le contexte Tassi pour la modale d'une commande.
 * `orderId` = `orders.id` (uuid).
 */
export async function getOrderTassiContext(orderId: string): Promise<OrderTassiContext> {
    // Auth + check rôle avec la session de l'appelant
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) {
        return {
            success: false,
            error: 'unauthorized',
            can_launch: false,
            confection_completed_at: null,
            missing_fields: [],
            couturier_id: null,
            shipment: null,
        }
    }
    const role = getUserRole(user)
    if (!isProfessionalRole(role)) {
        return {
            success: false,
            error: 'forbidden',
            can_launch: false,
            confection_completed_at: null,
            missing_fields: [],
            couturier_id: null,
            shipment: null,
        }
    }

    // Les lectures métier passent par le service role pour bypasser les RLS
    // (notamment `orders` qui est typiquement restreinte à `user_id = auth.uid()`).
    // C'est safe : on a déjà gate par `isProfessionalRole` ci-dessus.
    const supabase = createSupabaseServiceClient()

    // Order
    const {data: order, error: orderErr} = await supabase
        .from('orders')
        .select(
            'id, customer_name, customer_phone, customer_email, location, specific_location, couturier_confection_completed_at, agent_id, model_id',
        )
        .eq('id', orderId)
        .maybeSingle()
    if (orderErr || !order) {
        return {
            success: false,
            error: 'order_not_found',
            can_launch: false,
            confection_completed_at: null,
            missing_fields: [],
            couturier_id: null,
            shipment: null,
        }
    }

    // Couturier implicite via modeles.professional_id
    let couturierId: string | null = null
    if (order.model_id) {
        const {data: modele} = await supabase
            .from('modeles')
            .select('professional_id')
            .eq('id', order.model_id)
            .maybeSingle<{professional_id: string | null}>()
        couturierId = modele?.professional_id ?? null
    }

    // Charger le shop du couturier (depuis app_metadata.shop)
    let couturierShop: CouturierShop = {
        name: null,
        phone: null,
        address_line1: null,
        address_city: null,
        address_zip: null,
        address_country: null,
    }
    if (couturierId) {
        const {data: {user: couturierUser}} = await supabase.auth.admin.getUserById(couturierId)
        if (couturierUser) {
            const shop = (couturierUser.app_metadata as {shop?: AuthShop} | null)?.shop ?? {}
            couturierShop = {
                name: shop.name ?? null,
                phone: shop.phone ?? couturierUser.phone ?? null,
                address_line1: shop.address_line1 ?? null,
                address_city: shop.address_city ?? null,
                address_zip: shop.address_zip ?? null,
                address_country: shop.address_country ?? null,
            }
        }
    }

    // Client = snapshots dans orders
    const client: ClientDelivery = {
        full_name: order.customer_name,
        phone: order.customer_phone,
        address_line1: order.specific_location ?? order.location ?? null,
        address_city: order.location ?? null,
        address_zip: null,
        address_country: 'BJ',
    }
    const missing = collectMissingFields(couturierShop, client)

    // Shipment Tassi déjà créé ?
    const {data: shipmentRow} = await supabase
        .from('tassi_shipments')
        .select(
            'id, tassi_id, tassi_status, delivery_status, tracking_url, label_url, carrier_code, couturier_notes, created_at',
        )
        .eq('order_id', orderId)
        .maybeSingle<{
            id: string
            tassi_id: string
            tassi_status: TassiShipmentStatus
            delivery_status: DeliveryStatus
            tracking_url: string | null
            label_url: string | null
            carrier_code: string | null
            couturier_notes: string | null
            created_at: string
        }>()

    // Droit d'agir
    const canLaunch = decideCanLaunch(role, user.id, couturierId, order.agent_id ?? null)

    return {
        success: true,
        can_launch: canLaunch,
        confection_completed_at: order.couturier_confection_completed_at,
        missing_fields: missing,
        couturier_id: couturierId,
        shipment: shipmentRow ?? null,
    }
}

function decideCanLaunch(
    role: Role | null,
    userId: string,
    couturierId: string | null,
    agentId: string | null,
): boolean {
    if (!role) return false
    if (role === 'admin') return true
    if (role === 'couturier') return couturierId === userId
    if (role === 'agent') return agentId === userId
    return false
}

export interface MarkConfectionResult {
    success: boolean
    error?: string
    completed_at?: string | null
}

/**
 * Pose `orders.couturier_confection_completed_at = now()` (ou null pour
 * annuler — ex: erreur de saisie). Réservé à admin OU couturier propriétaire.
 */
export async function markConfectionCompleted(
    orderId: string,
    completed: boolean,
): Promise<MarkConfectionResult> {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) return {success: false, error: 'unauthorized'}
    const role = getUserRole(user)
    if (role !== 'admin' && role !== 'couturier') {
        return {success: false, error: 'forbidden'}
    }

    // Bypass RLS pour la lecture/update de `orders` — ownership re-vérifié ci-dessous.
    const supabase = createSupabaseServiceClient()

    // Récupérer le couturier de la commande pour vérifier ownership
    if (role === 'couturier') {
        const {data: order} = await supabase
            .from('orders')
            .select('model_id, modeles:model_id(professional_id)')
            .eq('id', orderId)
            .maybeSingle<{model_id: string | null; modeles: {professional_id: string} | null}>()
        const couturierId = order?.modeles?.professional_id ?? null
        if (couturierId !== user.id) {
            return {success: false, error: 'not_your_order'}
        }
    }

    const newValue = completed ? new Date().toISOString() : null
    const {error} = await supabase
        .from('orders')
        .update({couturier_confection_completed_at: newValue})
        .eq('id', orderId)

    if (error) {
        console.error('[markConfectionCompleted]', error)
        return {success: false, error: 'db_update_failed'}
    }
    return {success: true, completed_at: newValue}
}
