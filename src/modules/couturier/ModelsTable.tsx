'use client'

import { PencilIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline'

interface ModelEntity {
    id: string
    name: string
    description: string
    price: number
    created_at: string
    // ... autres champs
}

interface ModelsTableProps {
    models: ModelEntity[]
    loading?: boolean
    actionLoading?: string | null
    onEdit?: (model: ModelEntity) => void
    onView?: (model: ModelEntity) => void
    onDelete?: (modelId: string) => void
}

export function ModelsTable({
    models,
    loading = false,
    actionLoading = null,
    onEdit,
    onView,
    onDelete
}: ModelsTableProps) {

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
    }

    if (models.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 text-lg">Aucun modèle trouvé</p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-700">
                        <th className="text-left px-6 py-4 font-semibold text-black dark:text-white">Nom du modèle</th>
                        <th className="text-left px-6 py-4 font-semibold text-black dark:text-white">Description</th>
                        <th className="text-right px-6 py-4 font-semibold text-black dark:text-white">Prix</th>
                        <th className="text-right px-6 py-4 font-semibold text-black dark:text-white">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {models.map((model, idx) => (
                        <tr
                            key={model.id}
                            className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${
                                idx === models.length - 1 ? 'border-b-0' : ''
                            }`}
                        >
                            <td className="px-6 py-4">
                                <div className="font-medium text-black dark:text-white">{model.name}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{formatDate(model.created_at)}</div>
                            </td>
                            <td className="px-6 py-4 text-black dark:text-white">{model.description}</td>
                            <td className="px-6 py-4 text-right text-black dark:text-white font-medium">
                                {formatCurrency(model.price)}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => onView?.(model)}
                                        className="p-2 text-gray-400 hover:text-white bg-transparent rounded-lg"
                                        title="Consulter"
                                    >
                                        <EyeIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onEdit?.(model)}
                                        className="p-2 text-gray-400 hover:text-white bg-transparent rounded-lg"
                                        title="Modifier"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onDelete?.(model.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 bg-transparent rounded-lg"
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
