/**
 * Source de vérité pour les statuts de livraison.
 * À aligner avec la table `deliveries` (à créer côté backend si pas encore fait).
 */

export type DeliveryStatus =
    | 'pending'
    | 'assigned'
    | 'picked_up'
    | 'in_transit'
    | 'delivered'
    | 'cancelled'

export type DeliveryPriority = 'low' | 'normal' | 'high' | 'urgent'

export const DELIVERY_STATUS_LABELS_FR: Record<DeliveryStatus, string> = {
    pending: 'En attente',
    assigned: 'Assignée',
    picked_up: 'Récupérée',
    in_transit: 'En transit',
    delivered: 'Livrée',
    cancelled: 'Annulée',
}

/** Transition canonique du parcours livraison. `null` = état terminal. */
export const DELIVERY_NEXT_STATUS: Record<DeliveryStatus, DeliveryStatus | null> = {
    pending: 'assigned',
    assigned: 'picked_up',
    picked_up: 'in_transit',
    in_transit: 'delivered',
    delivered: null,
    cancelled: null,
}

export const DELIVERY_NEXT_LABEL: Partial<Record<DeliveryStatus, string>> = {
    assigned: 'Marquer récupérée',
    picked_up: 'Marquer en transit',
    in_transit: 'Marquer livrée',
    // 'pending' → 'assigned' passe par la modale Assigner, pas par ce bouton
}

export function isDeliveryTerminal(status: DeliveryStatus): boolean {
    return status === 'delivered' || status === 'cancelled'
}
