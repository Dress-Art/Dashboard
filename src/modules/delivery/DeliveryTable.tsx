'use client'

import {EyeIcon, XMarkIcon, ArrowRightIcon, UserPlusIcon, PaperAirplaneIcon, MapPinIcon} from '@heroicons/react/24/outline'
import {
    type DeliveryStatus,
    type DeliveryPriority,
    DELIVERY_STATUS_LABELS_FR,
    DELIVERY_NEXT_STATUS,
    DELIVERY_NEXT_LABEL,
    isDeliveryTerminal,
} from '@/types/delivery.types'
import type {TassiPackage} from '@/types/tassi.types'

export interface DeliveryEntity {
    id: string
    orderId: string
    customerName: string
    customerAddress: string
    customerPhone?: string
    driverId?: string
    driverName?: string
    status: DeliveryStatus
    priority: DeliveryPriority
    estimatedTime?: string
    actualDeliveryTime?: string
    created_at: string
    assigned_at?: string
    /** Identifiant Tassi (format `shp_*`) — clé canonique pour webhooks et polling. */
    tassi_shipment_id?: string | null
    /** Numéro de tracking exposable au client. */
    tassi_tracking_number?: string | null
}

interface DeliveryTableProps {
    deliveries: DeliveryEntity[]
    loading: boolean
    /** Action "Assigner" (transition pending → assigned, ouvre modale livreur). */
    onAssign: (delivery: DeliveryEntity) => void
    /** Transition canonique vers l'étape suivante (assigned → picked_up etc.). */
    onAdvance: (delivery: DeliveryEntity, next: DeliveryStatus) => void
    /** Annule une livraison non terminale. */
    onCancel: (delivery: DeliveryEntity) => void
    /** Détails (futur — placeholder pour l'instant). */
    onView?: (delivery: DeliveryEntity) => void
    /** « Envoyer à Tassi » : créé un colis Tassi à partir de cette livraison. */
    onSendToTassi?: (delivery: DeliveryEntity) => void
    actionLoading: string | null
    /**
     * Statuts Tassi live indexés par `delivery.id` (résolus côté parent
     * via /api/tassi/shipments/[id]). Si non défini = en cours de chargement
     * ou pas de shipment Tassi lié.
     */
    tassiByDeliveryId?: Record<string, TassiPackage | 'loading' | 'error'>
    /** URL publique de tracking Tassi (pattern avec {tracking_number}). */
    tassiTrackingUrlPattern?: string
}

const STATUS_COLORS: Record<DeliveryStatus, string> = {
    pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    assigned: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    picked_up: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    in_transit: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    delivered: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
}

const PRIORITY_COLORS: Record<DeliveryPriority, string> = {
    low: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    normal: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
}

const PRIORITY_LABEL: Record<DeliveryPriority, string> = {
    low: 'Basse',
    normal: 'Normale',
    high: 'Haute',
    urgent: 'Urgent',
}

/** Map des statuts Tassi → couleur de badge (cohérent avec STATUS_COLORS). */
const TASSI_STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    assigned: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    picked_up: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    in_transit: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    delivered: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    returned: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300',
}

interface TassiCellProps {
    delivery: DeliveryEntity
    state: TassiPackage | 'loading' | 'error' | undefined
}

function TassiCell({
    delivery,
    state,
    trackingUrlPattern,
}: TassiCellProps & {trackingUrlPattern?: string}) {
    if (!delivery.tassi_shipment_id && !delivery.tassi_tracking_number) {
        return <span className="text-xs text-gray-400">—</span>
    }
    const trackingUrl =
        delivery.tassi_tracking_number && trackingUrlPattern
            ? trackingUrlPattern.replace('{tracking_number}', encodeURIComponent(delivery.tassi_tracking_number))
            : null
    return (
        <div className="flex flex-col gap-1">
            {delivery.tassi_tracking_number && (
                trackingUrl ? (
                    <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[140px] inline-flex items-center gap-1"
                        title="Suivre la livraison sur Tassi"
                    >
                        <MapPinIcon className="w-3 h-3 shrink-0" />
                        {delivery.tassi_tracking_number}
                    </a>
                ) : (
                    <code className="text-[10px] font-mono text-gray-600 dark:text-gray-400 truncate max-w-[140px]">
                        {delivery.tassi_tracking_number}
                    </code>
                )
            )}
            {state === 'loading' && (
                <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse" />
                    Tassi…
                </span>
            )}
            {state === 'error' && (
                <span className="text-[10px] text-red-500">Tassi: erreur</span>
            )}
            {state && state !== 'loading' && state !== 'error' && (
                <span
                    className={`inline-flex w-fit px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                        TASSI_STATUS_COLORS[state.status] ?? 'bg-gray-100 text-gray-700'
                    }`}
                    title={`Tassi shipment ${delivery.tassi_shipment_id ?? state.id}`}
                >
                    Tassi: {state.status}
                </span>
            )}
        </div>
    )
}

export function DeliveryTable({
    deliveries,
    loading,
    onAssign,
    onAdvance,
    onCancel,
    onView,
    onSendToTassi,
    actionLoading,
    tassiByDeliveryId,
    tassiTrackingUrlPattern,
}: DeliveryTableProps) {
    if (deliveries.length === 0 && !loading) {
        return (
            <div className="text-center py-12 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
                    Aucune livraison trouvée
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                    Les livraisons apparaîtront ici une fois créées.
                </p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto border border-gray-300 dark:border-gray-700 rounded-lg">
            <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700">
                    <tr>
                        {['Commande', 'Client', 'Livreur', 'Statut', 'Tassi', 'Priorité', 'Estimée', 'Actions'].map(h => (
                            <th
                                key={h}
                                className={`px-6 py-4 text-xs font-semibold text-black dark:text-white uppercase tracking-wider ${
                                    h === 'Actions' ? 'text-right' : 'text-left'
                                }`}
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 dark:divide-gray-700">
                    {deliveries.map(d => {
                        const next = DELIVERY_NEXT_STATUS[d.status]
                        const advanceLabel = DELIVERY_NEXT_LABEL[d.status]
                        const busy = (suffix: string) => actionLoading === `${suffix}-${d.id}`
                        return (
                            <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="text-sm font-semibold text-black dark:text-white">#{d.orderId}</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {new Date(d.created_at).toLocaleDateString('fr-FR')}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-black dark:text-white">{d.customerName}</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">{d.customerAddress}</div>
                                    {d.customerPhone && (
                                        <div className="text-xs text-gray-600 dark:text-gray-400">{d.customerPhone}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {d.driverId ? (
                                        <div>
                                            <div className="text-sm font-medium text-black dark:text-white">
                                                {d.driverName || 'Livreur assigné'}
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400">ID: {d.driverId}</div>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Non assigné</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[d.status]}`}>
                                        {DELIVERY_STATUS_LABELS_FR[d.status]}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <TassiCell
                                        delivery={d}
                                        state={tassiByDeliveryId?.[d.id]}
                                        trackingUrlPattern={tassiTrackingUrlPattern}
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${PRIORITY_COLORS[d.priority]}`}>
                                        {PRIORITY_LABEL[d.priority]}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                    {d.estimatedTime
                                        ? new Date(d.estimatedTime).toLocaleDateString('fr-FR')
                                        : '—'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end gap-1.5 flex-wrap">
                                        {/* pending → ouvre la modale Assigner */}
                                        {d.status === 'pending' && (
                                            <button
                                                onClick={() => onAssign(d)}
                                                disabled={busy('assign')}
                                                className="px-3 py-1.5 text-xs font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center gap-1"
                                            >
                                                <UserPlusIcon className="w-3.5 h-3.5" />
                                                Assigner
                                            </button>
                                        )}
                                        {/* assigned → picked_up → in_transit → delivered : bouton "étape suivante" */}
                                        {next && advanceLabel && (
                                            <button
                                                onClick={() => onAdvance(d, next)}
                                                disabled={busy('advance')}
                                                className="px-3 py-1.5 text-xs font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center gap-1"
                                            >
                                                <ArrowRightIcon className="w-3.5 h-3.5" />
                                                {advanceLabel}
                                            </button>
                                        )}
                                        {onSendToTassi && !d.tassi_shipment_id && !isDeliveryTerminal(d.status) && (
                                            <button
                                                onClick={() => onSendToTassi(d)}
                                                disabled={busy('tassi')}
                                                className="px-2 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 disabled:opacity-50 transition-colors flex items-center gap-1"
                                                title="Créer le colis chez Tassi"
                                            >
                                                <PaperAirplaneIcon className="w-3.5 h-3.5" />
                                                Tassi
                                            </button>
                                        )}
                                        {onView && (
                                            <button
                                                onClick={() => onView(d)}
                                                className="p-1.5 text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                                title="Voir"
                                            >
                                                <EyeIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                        {!isDeliveryTerminal(d.status) && (
                                            <button
                                                onClick={() => onCancel(d)}
                                                disabled={busy('cancel')}
                                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50 transition-colors"
                                                title="Annuler"
                                            >
                                                <XMarkIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
