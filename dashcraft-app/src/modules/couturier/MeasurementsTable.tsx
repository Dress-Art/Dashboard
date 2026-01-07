'use client'

import { PencilIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline'

interface MeasurementEntity {
    id: string
    client_name: string
    measurement_name: string
    value: number
    unit: string
    created_at: string
}

interface MeasurementsTableProps {
    measurements: MeasurementEntity[]
    loading?: boolean
    actionLoading?: string | null
    onEdit?: (measurement: MeasurementEntity) => void
    onView?: (measurement: MeasurementEntity) => void
    onDelete?: (measurementId: string) => void
}

export function MeasurementsTable({
    measurements,
    loading = false,
    actionLoading = null,
    onEdit,
    onView,
    onDelete
}: MeasurementsTableProps) {

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })
    }

    if (measurements.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 text-lg">Aucune mesure trouvée</p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-700">
                        <th className="text-left px-6 py-4 font-semibold text-black dark:text-white">Client</th>
                        <th className="text-left px-6 py-4 font-semibold text-black dark:text-white">Type de mesure</th>
                        <th className="text-right px-6 py-4 font-semibold text-black dark:text-white">Valeur</th>
                        <th className="text-right px-6 py-4 font-semibold text-black dark:text-white">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {measurements.map((measurement, idx) => (
                        <tr
                            key={measurement.id}
                            className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${
                                idx === measurements.length - 1 ? 'border-b-0' : ''
                            }`}
                        >
                            <td className="px-6 py-4">
                                <div className="font-medium text-black dark:text-white">{measurement.client_name}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{formatDate(measurement.created_at)}</div>
                            </td>
                            <td className="px-6 py-4 text-black dark:text-white">{measurement.measurement_name}</td>
                            <td className="px-6 py-4 text-right text-black dark:text-white font-medium">
                                {measurement.value} {measurement.unit}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => onView?.(measurement)}
                                        className="p-2 text-gray-400 hover:text-white bg-transparent rounded-lg"
                                        title="Consulter"
                                    >
                                        <EyeIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onEdit?.(measurement)}
                                        className="p-2 text-gray-400 hover:text-white bg-transparent rounded-lg"
                                        title="Modifier"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onDelete?.(measurement.id)}
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
