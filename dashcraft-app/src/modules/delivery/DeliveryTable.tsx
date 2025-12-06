'use client'

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

export function DeliveryTable({ deliveries, loading, onAssign, actionLoading }: DeliveryTableProps) {
    if (deliveries.length === 0 && !loading) {
        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Aucune livraison trouvée
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                    Les livraisons apparaîtront ici une fois créées.
                </p>
            </div>
        )
    }

    const getStatusBadge = (status: string) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-800',
            assigned: 'bg-blue-100 text-blue-800',
            picked_up: 'bg-orange-100 text-orange-800',
            in_transit: 'bg-purple-100 text-purple-800',
            delivered: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800'
        }
        return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
    }

    const getStatusText = (status: string) => {
        const texts = {
            pending: '⏳ En attente',
            assigned: '👤 Assignée',
            picked_up: '📋 Récupérée',
            in_transit: '🚚 En cours',
            delivered: '✅ Livrée',
            cancelled: '❌ Annulée'
        }
        return texts[status as keyof typeof texts] || status
    }

    const getPriorityBadge = (priority: string) => {
        const badges = {
            low: 'bg-gray-100 text-gray-600',
            normal: 'bg-blue-100 text-blue-600',
            high: 'bg-orange-100 text-orange-600',
            urgent: 'bg-red-100 text-red-600'
        }
        return badges[priority as keyof typeof badges] || 'bg-gray-100 text-gray-600'
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Commande
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Livreur
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Statut
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Priorité
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Temps estimé
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {deliveries.map((delivery) => (
                        <tr key={delivery.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    #{delivery.orderId}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {new Date(delivery.created_at).toLocaleDateString()}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {delivery.customerName}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    📍 {delivery.customerAddress}
                                </div>
                                {delivery.customerPhone && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        📞 {delivery.customerPhone}
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                {delivery.driverId ? (
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {delivery.driverName || 'Livreur assigné'}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            ID: {delivery.driverId}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        Non assigné
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(delivery.status)}`}>
                                    {getStatusText(delivery.status)}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadge(delivery.priority)}`}>
                                    {delivery.priority.charAt(0).toUpperCase() + delivery.priority.slice(1)}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                {delivery.estimatedTime 
                                    ? new Date(delivery.estimatedTime).toLocaleString()
                                    : 'Non défini'
                                }
                            </td>
                            <td className="px-6 py-4 text-right text-sm space-x-2">
                                {delivery.status === 'pending' && (
                                    <button
                                        onClick={() => onAssign(delivery)}
                                        disabled={actionLoading === `assign-${delivery.id}`}
                                        className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                                    >
                                        Assigner
                                    </button>
                                )}
                                <button
                                    disabled={actionLoading === `track-${delivery.id}`}
                                    className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                                >
                                    Suivre
                                </button>
                                {delivery.status !== 'delivered' && delivery.status !== 'cancelled' && (
                                    <button
                                        disabled={actionLoading === `cancel-${delivery.id}`}
                                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                    >
                                        Annuler
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