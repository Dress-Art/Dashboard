/**
 * Types Tassi.pro — STRICTEMENT alignés sur la doc officielle
 * (https://docs.tassi.pro/parcel-manager, /authentication, /request).
 *
 * Toute évolution doit citer la page de doc qui la justifie.
 * Aucun champ inventé. Si un champ manque pour Dress Art, il est typé
 * `unknown` ou ajouté dans le `metadata` libre prévu par Tassi.
 */

// =============================================================================
// Adresse — spec §11.2
// =============================================================================

export interface TassiAddress {
    /** Première ligne d'adresse postale. */
    line1: string
    city: string
    /** Code postal (peut être vide selon le pays). */
    zip: string
    /** ISO 3166-1 alpha-2 (ex: 'BJ', 'FR'). */
    country: string
}

// =============================================================================
// Parcel — spec §11.1
// =============================================================================

export interface TassiParcelDimensions {
    length: number
    width: number
    height: number
    /** Spec liste `cm` comme exemple — autres unités à confirmer Tassi. */
    unit: 'cm'
}

export interface TassiParcel {
    description: string
    /** Poids (unité non documentée — Dress Art utilise kg par convention §6.2). */
    weight: number
    dimensions: TassiParcelDimensions
    /** Valeur déclarée (optionnelle selon le contenu). */
    value?: number
    /** ISO 4217 (ex: 'XOF', 'EUR'). */
    currency?: string
    /** Spec liste `textile` comme exemple — liste fermée à confirmer. */
    content_type?: string
    /** Code SH (Système Harmonisé douane). */
    hs_code?: string
    dangerous_goods?: boolean
    /** Notes pour le transporteur (ex: "Ne pas plier"). */
    notes?: string
}

// =============================================================================
// Acteurs (origin / destination) — spec §11.2
// =============================================================================

export interface TassiActor {
    name: string
    phone: string
    address: TassiAddress
}

// =============================================================================
// Shipment — spec §11.2
// =============================================================================

/**
 * Mode de prise en charge documenté par Tassi : `pickup` (Tassi vient
 * chercher le colis) ou `dropoff` (l'expéditeur dépose au point relais).
 */
export type TassiShipmentMode = 'pickup' | 'dropoff'

/**
 * Statuts shipment documentés par Tassi (spec §9.1).
 * 9 valeurs, ordre canonique du parcours :
 *   created → label_generated → picked_up → in_transit → out_for_delivery → delivered
 *   + branches d'échec : exception, returned, canceled
 */
export type TassiShipmentStatus =
    | 'created'
    | 'label_generated'
    | 'picked_up'
    | 'in_transit'
    | 'out_for_delivery'
    | 'delivered'
    | 'exception'
    | 'returned'
    | 'canceled'

/** Statuts terminaux (polling stoppé). Spec §4.3. */
export const TERMINAL_STATUSES = ['delivered', 'canceled', 'returned'] as const satisfies readonly TassiShipmentStatus[]

/**
 * Body accepté par `POST /v1/shipments` — spec §11.2.
 * NB : `parcel` (singulier) vs `parcels` (tableau) flagué comme incohérence
 * dans la doc Tassi (spec §16). On part sur `parcel` singulier, à confirmer.
 */
export interface TassiShipmentCreateInput {
    description: string
    parcel: TassiParcel
    origin: TassiActor
    destination: TassiActor
    mode: TassiShipmentMode
    /** Notre identifiant unique côté Dress Art (orders.id). */
    client_reference: string
    /** Métadonnées libres (sans PII — spec §10.4). */
    metadata?: Record<string, string>
    /** URL appelée par Tassi après action (génération étiquette, etc.). */
    callback_url?: string
}

export interface TassiShipment {
    id: string
    status: TassiShipmentStatus
    /** Timestamps Tassi (format ISO). */
    created_at?: string
    updated_at?: string
    /** Code transporteur sélectionné (peut apparaître après `label_generated`). */
    carrier_code?: string
    tracking_url?: string
    label_url?: string
    /** Snapshot des données envoyées + ce que Tassi y ajoute. */
    description?: string
    parcel?: TassiParcel
    origin?: TassiActor
    destination?: TassiActor
    mode?: TassiShipmentMode
    client_reference?: string
    metadata?: Record<string, string>
    [key: string]: unknown
}

export interface TassiLabelResponse {
    label_url: string
    tracking_url: string
}

// =============================================================================
// Enveloppe générique de réponse Tassi (spec §16 — un seul exemple dans la doc)
// =============================================================================

export interface TassiResponse<T> {
    data: T
    meta?: {
        request_id?: string
        [key: string]: unknown
    }
}

// =============================================================================
// Pagination liste — spec §16 (format cursor non documenté précisément)
// =============================================================================

export interface TassiListMeta {
    next_cursor?: string | null
    prev_cursor?: string | null
    request_id?: string
    [key: string]: unknown
}

export interface TassiListResponse<T> {
    data: T[]
    meta?: TassiListMeta
}

// =============================================================================
// Erreur Tassi — spec §12
// =============================================================================

export interface TassiErrorBody {
    error: {
        code?: string
        message?: string
        errors?: Array<{field?: string; message?: string}>
    }
    meta?: {request_id?: string}
}
