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
 * Statuts qu'un rôle est autorisé à *appliquer* via le bouton "étape suivante".
 * - admin : tous les statuts.
 * - couturier : transitions production (sewing → finishing → ready_for_delivery)
 *   + 'paid' s'il encaisse en direct (cash / mobile money hors FedaPay).
 * - agent : encaissement + validation mesures.
 * - livreur : livraison finale.
 * - vendeur : aucun.
 */
export const ALLOWED_TRANSITIONS_BY_ROLE: Record<string, ReadonlySet<OrderStatus>> = {
    admin: new Set<OrderStatus>([
        'paid',
        'measurements_validated',
        'sewing',
        'finishing',
        'ready_for_delivery',
        'delivered',
        'cancelled',
    ]),
    // Couturier = pilote production uniquement. Le marketplace gère
    // confirmed → paid (FedaPay) et paid → measurements_validated (agent/
    // admin), c'est pourquoi le couturier ne peut PAS appliquer ces deux
    // statuts (le backend marketplace les rejette en 400 pour ce rôle).
    couturier: new Set<OrderStatus>([
        'sewing',
        'finishing',
        'ready_for_delivery',
    ]),
    agent: new Set<OrderStatus>([
        'paid',
        'measurements_validated',
        'cancelled',
    ]),
    livreur: new Set<OrderStatus>([
        'delivered',
    ]),
    vendeur: new Set<OrderStatus>(),
    client: new Set<OrderStatus>(),
}

/** Vrai si le rôle peut annuler une commande. */
export function canCancelOrder(role: string | null | undefined): boolean {
    return role === 'admin' || role === 'agent' || role === 'couturier'
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
