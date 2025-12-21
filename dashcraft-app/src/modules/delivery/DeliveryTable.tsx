'use client'

import { PencilIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline'

interface DeliveryEntity {
    id: string
    orderId: string
    customerName: string
    customerAddress: string
    customerPhone?: string
    driverId?: string
    driverName?: string
    status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled'
    priority: 'low' | 'normal' | 'high' | 'urgent'
    estimatedTime?: string
    actualDeliveryTime?: string
    created_at: string
    assigned_at?: string
    tracking_info?: {
        current_location?: string
        estimated_arrival?: string
        delivery_notes?: string
    }
}

interface DeliveryTableProps {
    deliveries: DeliveryEntity[]
    loading: boolean
    onAssign: (delivery: DeliveryEntity) => void
    actionLoading: string | null
}

function getStatusColor(status: string) {
    switch (status) {
        case 'pending':
            return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
        case 'assigned':
            return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
        case 'picked_up':
            return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
        case 'in_transit':
            return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
        case 'delivered':
            return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
        case 'cancelled':
            return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
        default:
            return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
    }
}

function getStatusText(status: string) {
    const texts = {
        pending: 'En attente',
        assigned: 'Assignée',
        picked_up: 'Récupérée',
        in_transit: 'En cours',
        delivered: 'Livrée',
        cancelled: 'Annulée'
    }
    return texts[status as keyof typeof texts] || status
}

function getPriorityColor(priority: string) {
    switch (priority) {
        case 'low':
            return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
        case 'normal':
            return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
        case 'high':
            return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
        case 'urgent':
            return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        default:
            return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    }
}

export function DeliveryTable({ deliveries, loading, onAssign, actionLoading }: DeliveryTableProps) {
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
                        <th className="px-6 py-4 text-left text-xs font-semibold text-black dark:text-white uppercase tracking-wider">
                            Commande
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-black dark:text-white uppercase tracking-wider">
                            Client
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-black dark:text-white uppercase tracking-wider">
                            Livreur
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-black dark:text-white uppercase tracking-wider">
                            Statut
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-black dark:text-white uppercase tracking-wider">
                            Priorité
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-black dark:text-white uppercase tracking-wider">
                            Temps estimé
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-black dark:text-white uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 dark:divide-gray-700">
                    {deliveries.map((delivery) => (
                        <tr key={delivery.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="text-sm font-semibold text-black dark:text-white">
                                    #{delivery.orderId}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {new Date(delivery.created_at).toLocaleDateString('fr-FR')}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-black dark:text-white">
                                    {delivery.customerName}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {delivery.customerAddress}
                                </div>
                                {delivery.customerPhone && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {delivery.customerPhone}
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                {delivery.driverId ? (
                                    <div>
                                        <div className="text-sm font-medium text-black dark:text-white">
                                            {delivery.driverName || 'Livreur assigné'}
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                            ID: {delivery.driverId}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        Non assigné
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                                    {getStatusText(delivery.status)}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getPriorityColor(delivery.priority)}`}>
                                    {delivery.priority.charAt(0).toUpperCase() + delivery.priority.slice(1)}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                {delivery.estimatedTime 
                                    ? new Date(delivery.estimatedTime).toLocaleDateString('fr-FR')
                                    : 'Non défini'
                                }
                            </td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                {delivery.status === 'pending' && (
                                    <button
                                        onClick={() => onAssign(delivery)}
                                        disabled={actionLoading === `assign-${delivery.id}`}
                                        className="text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 disabled:opacity-50 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                        title="Assigner"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    disabled={actionLoading === `track-${delivery.id}`}
                                    className="text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 disabled:opacity-50 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    title="Suivre"
                                >
                                    <EyeIcon className="w-4 h-4" />
                                </button>
                                {delivery.status !== 'delivered' && delivery.status !== 'cancelled' && (
                                    <button
                                        disabled={actionLoading === `cancel-${delivery.id}`}
                                        className="text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 disabled:opacity-50 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                        title="Supprimer"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}