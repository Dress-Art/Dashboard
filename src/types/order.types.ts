/**
 * Source de vérité côté frontend pour la table `orders` (Supabase).
 * Reflète le schéma DB après migration "Suivi de fabrication" (8 statuts).
 */

export type OrderStatus =
    | 'confirmed'
    | 'paid'
    | 'measurements_validated'
    | 'sewing'
    | 'finishing'
    | 'ready_for_delivery'
    | 'delivered'
    | 'cancelled'

export type OrderPaymentStatus = 'pending' | 'partial' | 'paid'
export type OrderPaymentType = 'full' | 'partial'

/**
 * Étapes "Suivi de fabrication" affichées dans l'UI couturier/admin.
 * Ordre canonique du parcours, hors statuts terminaux.
 */
export const PRODUCTION_STEPS: readonly OrderStatus[] = [
    'confirmed',
    'paid',
    'measurements_validated',
    'sewing',
    'finishing',
    'ready_for_delivery',
    'delivered',
] as const

export const ORDER_STATUS_LABELS_FR: Record<OrderStatus, string> = {
    confirmed: 'Commande confirmée',
    paid: 'Paiement reçu',
    measurements_validated: 'Mesures validées',
    sewing: 'Couture en cours',
    finishing: 'Finitions',
    ready_for_delivery: 'Prêt pour livraison',
    delivered: 'Livré',
    cancelled: 'Annulée',
}

/**
 * Transitions valides pour le bouton "étape suivante".
 * `null` = état terminal, pas de transition automatique.
 */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
    confirmed: 'paid',
    paid: 'measurements_validated',
    measurements_validated: 'sewing',
    sewing: 'finishing',
    finishing: 'ready_for_delivery',
    ready_for_delivery: 'delivered',
    delivered: null,
    cancelled: null,
}

/**
 * Forme JSONB de `orders.measurements`. Champs libres (clé = nom de la mesure,
 * valeur = `{ value, unit }`) pour rester compatible avec les modèles variés.
 */
export interface OrderMeasurements {
    [name: string]: {value: number; unit: 'cm' | 'in'}
}

/**
 * Vue dashboard d'une commande. Snapshot des champs `orders` + jointures utiles
 * (model_name, fabric_name, professional_id côté couturier).
 */
export interface OrderRow {
    id: string
    order_number: string
    user_id: string | null
    client_id: string | null
    customer_name: string
    customer_phone: string
    customer_email: string | null
    model_id: string | null
    fabric_id: string | null
    measurements: OrderMeasurements | null
    appointment_date: string | null
    location: string | null
    specific_location: string | null
    total_amount: number
    paid_amount: number
    status: OrderStatus
    payment_status: OrderPaymentStatus
    payment_type: OrderPaymentType | null
    transaction_id: string | null
    created_at: string
    updated_at: string
    /** Jointures dénormalisées pour l'UI (optionnelles selon endpoint). */
    model_name?: string
    fabric_name?: string
    professional_id?: string
}
