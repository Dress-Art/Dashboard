'use client'

import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline'

interface AgentEntity {
    id: string
    name: string
    email: string
    skills: string[]
    status: 'available' | 'busy' | 'offline' | 'break'
    currentSessions: number
    maxConcurrentSessions: number
    totalSessions: number
    averageRating: number
    created_at: string
    last_active_at?: string
    performance_stats?: {
        resolved_sessions: number
        average_response_time: number
        customer_satisfaction: number
    }
}

interface AgentsTableProps {
    agents: AgentEntity[]
    loading: boolean
    onSuspend: (agentId: string, reason?: string) => void
    actionLoading: string | null
}

function getStatusColor(status: string) {
    switch (status) {
        case 'available':
            return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
        case 'busy':
            return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
        case 'break':
            return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
        default:
            return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
    }
}

function getStatusText(status: string) {
    switch (status) {
        case 'available':
            return 'Disponible'
        case 'busy':
            return 'Occupé'
        case 'break':
            return 'Pause'
        default:
            return 'Hors ligne'
    }
}

export function AgentsTable({ agents, loading, onSuspend, actionLoading }: AgentsTableProps) {
    if (agents.length === 0 && !loading) {
        return (
            <div className="text-center py-12 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
                    Aucun agent trouvé
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                    Commencez par créer votre premier agent support.
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
                            Agent
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-black dark:text-white uppercase tracking-wider">
                            Statut
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-black dark:text-white uppercase tracking-wider">
                            Sessions
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-black dark:text-white uppercase tracking-wider">
                            Note
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-black dark:text-white uppercase tracking-wider">
                            Dernière activité
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-black dark:text-white uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 dark:divide-gray-700">
                    {agents.map((agent) => (
                        <tr key={agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-black dark:text-white font-semibold text-sm">
                                        {agent.name[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-black dark:text-white">
                                            {agent.name}
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                            {agent.email}
                                        </div>
                                        {agent.skills.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {agent.skills.slice(0, 2).map((skill, index) => (
                                                    <span key={index} className="inline-flex px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-black dark:text-white rounded-full">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {agent.skills.length > 2 && (
                                                    <span className="inline-flex px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                                                        +{agent.skills.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(agent.status)}`}>
                                    {getStatusText(agent.status)}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-black dark:text-white">
                                    {agent.currentSessions}/{agent.maxConcurrentSessions}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {agent.totalSessions} total
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-black dark:text-white">
                                    {agent.averageRating.toFixed(1)}/5
                                </div>
                                {agent.performance_stats && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {agent.performance_stats.customer_satisfaction}% satis.
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                {agent.last_active_at 
                                    ? new Date(agent.last_active_at).toLocaleDateString('fr-FR')
                                    : 'Jamais'
                                }
                            </td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                <button
                                    disabled={actionLoading === `edit-${agent.id}`}
                                    className="text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 disabled:opacity-50 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    title="Modifier"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                    disabled={actionLoading === `suspend-${agent.id}`}
                                    onClick={() => onSuspend(agent.id)}
                                    className="text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 disabled:opacity-50 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    title="Supprimer"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                                <button
                                    disabled={actionLoading === `view-${agent.id}`}
                                    className="text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-400 disabled:opacity-50 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    title="Voir détails"
                                >
                                    <EyeIcon className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}