'use client'

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

export function AgentsTable({ agents, loading, onSuspend, actionLoading }: AgentsTableProps) {
    if (agents.length === 0 && !loading) {
        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Aucun agent trouvé
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                    Commencez par créer votre premier agent support.
                </p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Agent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Statut
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Sessions
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Performance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Dernière activité
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {agents.map((agent) => (
                        <tr key={agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-medium">
                                        {agent.name[0]?.toUpperCase()}
                                    </div>
                                    <div className="ml-3">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {agent.name}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {agent.email}
                                        </div>
                                        {agent.skills.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {agent.skills.slice(0, 2).map((skill, index) => (
                                                    <span key={index} className="inline-flex px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {agent.skills.length > 2 && (
                                                    <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                                        +{agent.skills.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    agent.status === 'available' ? 'bg-green-100 text-green-800' :
                                    agent.status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                                    agent.status === 'break' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {agent.status === 'available' ? '🟢 Disponible' :
                                     agent.status === 'busy' ? '🟡 Occupé' :
                                     agent.status === 'break' ? '🔵 Pause' :
                                     '🔴 Hors ligne'}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 dark:text-white">
                                    {agent.currentSessions}/{agent.maxConcurrentSessions}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {agent.totalSessions} au total
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 dark:text-white">
                                    ⭐ {agent.averageRating.toFixed(1)}
                                </div>
                                {agent.performance_stats && (
                                    <div className="text-xs text-gray-500">
                                        {agent.performance_stats.customer_satisfaction}% satisfaction
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                {agent.last_active_at 
                                    ? new Date(agent.last_active_at).toLocaleString()
                                    : 'Jamais'
                                }
                            </td>
                            <td className="px-6 py-4 text-right text-sm space-x-2">
                                <button
                                    disabled={actionLoading === `suspend-${agent.id}`}
                                    onClick={() => onSuspend(agent.id)}
                                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                >
                                    Suspendre
                                </button>
                                <button
                                    disabled={actionLoading === `reassign-${agent.id}`}
                                    className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                                >
                                    Réassigner
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}