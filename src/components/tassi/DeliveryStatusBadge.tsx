'use client'

import type {DeliveryStatus} from '@/lib/tassi/poll-status'

/**
 * Badge du statut métier Dress Art (spec §9.2). À utiliser comme affichage
 * principal — les utilisateurs (couturier, agent, admin, client) voient ce
 * badge en priorité, le `tassi_status` technique étant secondaire.
 */

const LABELS: Record<DeliveryStatus, string> = {
    preparing: 'Confection en cours',
    shipping_created: 'Envoi créé',
    in_delivery: 'En livraison',
    awaiting_client_confirmation: 'Attente confirmation client',
    confirmed: 'Confirmé',
    disputed: 'Litige',
    delivery_failed: 'Échec livraison',
}

const COLORS: Record<DeliveryStatus, string> = {
    preparing: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    shipping_created: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    in_delivery: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    awaiting_client_confirmation: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    confirmed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    disputed: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    delivery_failed: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
}

export function DeliveryStatusBadge({status}: {status: DeliveryStatus}) {
    return (
        <span
            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${COLORS[status]}`}
            title={`Statut métier Dress Art : ${status}`}
        >
            {LABELS[status]}
        </span>
    )
}
