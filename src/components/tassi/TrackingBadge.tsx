'use client'

import type {TassiShipmentStatus} from '@/lib/tassi/types'

/**
 * Badge du statut Tassi technique (spec §9.1). Affichage secondaire,
 * en complément du `<DeliveryStatusBadge>`. Utile pour le couturier qui
 * veut voir où en est physiquement le colis (picked_up, in_transit, etc.).
 *
 * 9 statuts documentés Tassi.
 */

const LABELS: Record<TassiShipmentStatus, string> = {
    created: 'Créé',
    label_generated: 'Étiquette',
    picked_up: 'Collecté',
    in_transit: 'En transit',
    out_for_delivery: 'En livraison',
    delivered: 'Livré',
    exception: 'Incident',
    returned: 'Retourné',
    canceled: 'Annulé',
}

const COLORS: Record<TassiShipmentStatus, string> = {
    created: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    label_generated: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    picked_up: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    in_transit: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    out_for_delivery: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300',
    delivered: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    exception: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    returned: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300',
    canceled: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
}

export function TrackingBadge({status, trackingUrl}: {status: TassiShipmentStatus; trackingUrl?: string | null}) {
    const badge = (
        <span
            className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${COLORS[status]}`}
            title={`Statut Tassi : ${status}`}
        >
            Tassi · {LABELS[status]}
        </span>
    )

    if (trackingUrl) {
        return (
            <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block hover:opacity-80"
            >
                {badge}
            </a>
        )
    }
    return badge
}
