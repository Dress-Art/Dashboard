'use client'

import { PencilIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline'

interface ClientEntity {
    id: string
    name: string
    email: string
    phone: string
    address: string
    city: string
    postal_code: string
    status: 'active' | 'inactive' | 'suspended'
    total_orders: number
    total_spent: number
    created_at: string
    last_order_at?: string
}

interface ClientsTableProps {
    clients: ClientEntity[]
    loading?: boolean
    actionLoading?: string | null
    onEdit?: (client: ClientEntity) => void
    onView?: (client: ClientEntity) => void
    onDelete?: (clientId: string) => void
}

export function ClientsTable({
    clients,
    loading = false,
    actionLoading = null,
    onEdit,
    onView,
    onDelete
}: ClientsTableProps) {
    
    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; text: string }> = {
            active: { bg: 'bg-green-900/30', text: 'text-green-300' },
            inactive: { bg: 'bg-gray-800', text: 'text-gray-300' },
            suspended: { bg: 'bg-red-900/30', text: 'text-red-300' }
        }
        
        const style = styles[status] || styles.inactive
        const labels: Record<string, string> = {
            active: 'Actif',
            inactive: 'Inactif',
            suspended: 'Suspendu'
        }
        
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
                {labels[status] || status}
            </span>
        )
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
    }

    if (clients.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 text-lg">Aucun client trouvé</p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-700">
                        <th className="text-left px-6 py-4 font-semibold text-black dark:text-white">Client</th>
                        <th className="text-left px-6 py-4 font-semibold text-black dark:text-white">Contact</th>
                        <th className="text-left px-6 py-4 font-semibold text-black dark:text-white">Localisation</th>
                        <th className="text-center px-6 py-4 font-semibold text-black dark:text-white">Statut</th>
                        <th className="text-right px-6 py-4 font-semibold text-black dark:text-white">Commandes</th>
                        <th className="text-right px-6 py-4 font-semibold text-black dark:text-white">Total dépensé</th>
                        <th className="text-right px-6 py-4 font-semibold text-black dark:text-white">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {clients.map((client, idx) => (
                        <tr
                            key={client.id}
                            className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${
                                idx === clients.length - 1 ? 'border-b-0' : ''
                            }`}
                        >
                            <td className="px-6 py-4">
                                <div className="font-medium text-black dark:text-white">{client.name}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{formatDate(client.created_at)}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-black dark:text-white">{client.email}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{client.phone}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-black dark:text-white">{client.city}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{client.postal_code}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                {getStatusBadge(client.status)}
                            </td>
                            <td className="px-6 py-4 text-right text-black dark:text-white font-medium">
                                {client.total_orders}
                            </td>
                            <td className="px-6 py-4 text-right text-black dark:text-white font-medium">
                                {formatCurrency(client.total_spent)}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => onView?.(client)}
                                        disabled={loading || actionLoading === `view-${client.id}`}
                                        className="p-2 text-gray-400 hover:text-white bg-transparent rounded-lg disabled:opacity-50 transition-colors"
                                        title="Consulter"
                                    >
                                        <EyeIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onEdit?.(client)}
                                        disabled={loading || actionLoading === `edit-${client.id}`}
                                        className="p-2 text-gray-400 hover:text-white bg-transparent rounded-lg disabled:opacity-50 transition-colors"
                                        title="Modifier"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onDelete?.(client.id)}
                                        disabled={loading || actionLoading === `delete-${client.id}`}
                                        className="p-2 text-gray-400 hover:text-red-500 bg-transparent rounded-lg disabled:opacity-50 transition-colors"
                                        title="Supprimer"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
