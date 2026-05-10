/**
 * Logique de polling Tassi + mapping de statuts.
 * Référence : spec §5.1 (state machine delivery_status), §7.2 (cadence adaptative).
 */

import {TERMINAL_STATUSES, type TassiShipmentStatus} from './types'

/** Vrai si le statut Tassi est terminal (polling à arrêter). Spec §4.3. */
export function isTerminal(status: string): boolean {
    return (TERMINAL_STATUSES as readonly string[]).includes(status)
}

/**
 * Cadence de polling adaptative côté serveur, en millisecondes.
 * Tableau spec §7.2 — fixed values, ne pas changer sans validation produit.
 */
const NEXT_POLL_DELAY_MS: Record<TassiShipmentStatus, number> = {
    created: 5 * 60_000,
    label_generated: 10 * 60_000,
    picked_up: 15 * 60_000,
    in_transit: 30 * 60_000,
    out_for_delivery: 5 * 60_000,
    exception: 30 * 60_000,
    delivered: 0,
    returned: 0,
    canceled: 0,
}

/** Délai (ms) avant le prochain poll selon le statut Tassi courant. */
export function computeNextPollDelay(status: string): number {
    return NEXT_POLL_DELAY_MS[status as TassiShipmentStatus] ?? 15 * 60_000
}

/**
 * Statuts Dress Art côté métier — spec §5.1.
 * Distincts des statuts Tassi (techniques) : les Dress Art incluent la
 * confirmation client.
 */
export type DeliveryStatus =
    | 'preparing'
    | 'shipping_created'
    | 'in_delivery'
    | 'awaiting_client_confirmation'
    | 'confirmed'
    | 'disputed'
    | 'delivery_failed'

/**
 * Mappe un statut Tassi vers le statut métier Dress Art.
 *
 * Garde-fous (spec §5.1) :
 *   - jamais de transition automatique vers `confirmed` (toujours via action
 *     client OU cron tacite, pas via polling)
 *   - jamais de rétrogradation depuis `confirmed` ou `disputed`
 *
 * @param tassiStatus statut Tassi courant
 * @param currentDeliveryStatus statut Dress Art actuel (pour détecter les
 *        états bloquants côté validation client)
 */
export function mapToDeliveryStatus(
    tassiStatus: string,
    currentDeliveryStatus: DeliveryStatus,
): DeliveryStatus {
    // Garde-fou : on ne touche jamais aux états validés/contestés par le client
    if (currentDeliveryStatus === 'confirmed' || currentDeliveryStatus === 'disputed') {
        return currentDeliveryStatus
    }

    switch (tassiStatus as TassiShipmentStatus) {
        case 'created':
            return 'shipping_created'
        case 'label_generated':
        case 'picked_up':
        case 'in_transit':
        case 'out_for_delivery':
            return 'in_delivery'
        case 'delivered':
            // Jamais auto-confirmé : on attend l'action client (ou cron tacite)
            return 'awaiting_client_confirmation'
        case 'exception':
        case 'returned':
        case 'canceled':
            return 'delivery_failed'
        default:
            return currentDeliveryStatus
    }
}
