/**
 * Types Tassi.pro — basés sur le sondage live de l'API sandbox
 * (https://sandbox-api.tassi.pro). À compléter au fur et à mesure que
 * de nouveaux endpoints/champs sont confirmés.
 *
 * Auth attendue : `Authorization: Bearer <tassi_pub_mkp_*>`
 *
 * Conventions :
 *   - Pas de `/v1` prefix
 *   - snake_case côté API ; on garde le même côté types pour rester 1:1
 *   - Pagination via `meta` (current_page/next_page/prev_page/per_page/total_pages/total_count)
 */

// =============================================================================
// Pagination & enveloppes
// =============================================================================

export interface TassiPaginationMeta {
    current_page: number
    next_page: number | null
    prev_page: number | null
    per_page: number
    total_pages: number
    total_count: number
}

export interface TassiList<T, K extends string> {
    /** Clé dynamique selon la ressource ('packages', 'orders', 'pickup_points', etc.). */
    [key: string]: T[] | TassiPaginationMeta
    meta: TassiPaginationMeta
}

export interface TassiError {
    /** Message lisible OU array de validation errors. */
    message: string | string[]
    errors?: {status?: string; [field: string]: string | string[] | undefined}
    model?: unknown
}

// =============================================================================
// Marketplace (notre identité dans Tassi)
// =============================================================================

export type TassiKycStatus = 'approved' | 'pending' | 'rejected' | 'submitted'

export interface TassiMarketplace {
    id: number
    name: string
    api_name: string | null
    website: string | null
    is_active: boolean
    api_configuration: Record<string, unknown>
    country_code: string | null
    phone_number: string | null
    email: string
    image_url: string | null
    logo_url: string | null
    city: string | null
    region: string | null
    postal_code: string | null
    address: string | null
    customers_count: number
    packages_count: number
    kyc_status: TassiKycStatus
    kyc_validated_at: string | null
    has_subscription: boolean
    subscription_info: {
        subscription_id: number
        status: string
        started_at: string
        ended_at?: string | null
    } | null
    created_at: string
    updated_at: string
}

// =============================================================================
// Pickup point (lieu de prise en charge)
// =============================================================================

export interface TassiPickupPoint {
    id: number
    name: string
    address: string
    city: string
    postal_code: string | null
    country_code: string | null
    phone_number?: string | null
    contact_name?: string | null
    /** Coordonnées GPS si fournies par Tassi */
    latitude?: number | null
    longitude?: number | null
    created_at: string
    updated_at: string
}

// =============================================================================
// Carrier (transporteur)
// =============================================================================

export interface TassiCarrier {
    id: number
    name: string
    description: string | null
    website: string | null
    contact_email: string | null
    contact_phone: string | null
    /** Activé pour notre marketplace */
    is_active?: boolean
}

// =============================================================================
// Customer (destinataire) — schéma à confirmer (route /customers en 404,
// possible que les customers soient inline dans /packages POST)
// =============================================================================

export interface TassiCustomer {
    id: number
    name?: string
    first_name?: string
    last_name?: string
    phone_number: string
    email?: string | null
    address?: string
    city?: string
    postal_code?: string | null
}

// =============================================================================
// Order (groupement Tassi — équivalent d'une « expédition » qui peut contenir
// plusieurs packages). Schéma minimum, à enrichir au fur et à mesure.
// =============================================================================

export interface TassiOrder {
    id: number
    status?: string
    customer?: TassiCustomer
    packages?: TassiPackage[]
    pickup_point_id?: number
    /** ID externe (= notre `orders.order_number` côté DressArt). */
    external_id?: string
    created_at: string
    updated_at: string
}

// =============================================================================
// Package (= « shipment » dans le vocabulaire UI Tassi) — colis logistique
// =============================================================================

/**
 * Statuts de package observés / déduits — à valider via la doc.
 * Vu : 'pending', 'delivered'. Les autres sont des candidats raisonnables.
 */
export type TassiPackageStatus =
    | 'pending'
    | 'assigned'
    | 'picked_up'
    | 'in_transit'
    | 'delivered'
    | 'cancelled'
    | 'returned'

export interface TassiPackage {
    id: number
    /** Numéro de tracking exposable au client final. */
    tracking_number?: string
    status: TassiPackageStatus
    /** Champs requis vus dans la validation POST : customer + weight. */
    weight: number
    weight_unit?: 'kg' | 'g'
    /** Snapshot du destinataire (peut référer un TassiCustomer.id). */
    customer: Partial<TassiCustomer> & {phone_number: string}
    pickup_point_id?: number
    carrier_id?: number
    destination_address?: string
    destination_city?: string
    destination_postal_code?: string
    /** ID de commande Tassi associée (groupe plusieurs packages). */
    order_id?: number
    /** ID externe (= notre `orders.id` ou `deliveries.id` côté DressArt). */
    external_id?: string
    created_at: string
    updated_at: string
}

/**
 * Body accepté par `POST /packages`.
 * Validation observée : `Customer must exist`, `Weight is not a number`.
 * Les autres champs restent à confirmer via doc/usage.
 */
export interface TassiCreatePackageInput {
    customer: {
        phone_number: string
        first_name?: string
        last_name?: string
        email?: string
        address?: string
        city?: string
        postal_code?: string
    }
    weight: number
    weight_unit?: 'kg' | 'g'
    pickup_point_id?: number
    carrier_id?: number
    destination_address?: string
    destination_city?: string
    destination_postal_code?: string
    /** Pour réconcilier côté DressArt avec `deliveries.id`. */
    external_id?: string
    notes?: string
}

// =============================================================================
// Webhooks (structure à confirmer — endpoint /webhooks renvoie 404 mais
// la doc mentionne webhookGuideUrl. Probable : signature HMAC en header).
// =============================================================================

export type TassiWebhookEventType =
    | 'package.created'
    | 'package.assigned'
    | 'package.picked_up'
    | 'package.in_transit'
    | 'package.delivered'
    | 'package.cancelled'
    | 'package.returned'

export interface TassiWebhookEvent<T = unknown> {
    event: TassiWebhookEventType
    delivered_at: string
    data: T
}
