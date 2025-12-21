'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { adminAPI } from '@/lib/admin-api'
import { AgentsTable } from './AgentsTable'
import { PlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

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

/**
 * AgentsPage
 * Page dédiée Agents avec gestion complète des agents support.
 */
export function AgentsPage() {
    const t = useTranslations('pages.agents')

    const [q, setQ] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<{
        items: AgentEntity[]
        total: number
    } | null>(null)

    // États pour les onglets et modales
    const [activeTab, setActiveTab] = useState('all')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingAgent, setEditingAgent] = useState<AgentEntity | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    // Formulaire nouvel agent
    const [newAgent, setNewAgent] = useState({
        name: '',
        email: '',
        skills: [] as string[],
        maxConcurrentSessions: 5
    })

    // 🔥 FONCTION: Traduire les erreurs réseau
    const translateError = (err: any): string => {
        if (err?.message?.includes('Failed to fetch') || err?.message?.includes('fetch')) {
            return 'Erreur de connexion réseau'
        }
        if (err?.message?.includes('Unauthorized') || err?.status === 401) {
            return 'Session expirée, veuillez vous reconnecter'
        }
        if (err?.message?.includes('Forbidden') || err?.status === 403) {
            return 'Vous n\'avez pas les permissions nécessaires'
        }
        return err instanceof Error ? err.message : 'Erreur lors du chargement'
    }

    // 🔥 FONCTION PRINCIPALE: Charger TOUS les agents
    const loadAgents = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await adminAPI.getAgents({
                ...(q.trim() && { search: q.trim() })
            })

            setData({
                items: response.agents || [],
                total: response.total || 0
            })

        } catch (err) {
            console.error('Erreur chargement agents:', err)
            setError(translateError(err))
            
            setData({
                items: [],
                total: 0
            })
        } finally {
            setLoading(false)
        }
    }

    // Charger les données au montage et quand la recherche change
    useEffect(() => {
        loadAgents()
    }, [q])

    // 🔥 CRÉER UN AGENT
    const handleCreateAgent = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!newAgent.name || !newAgent.email) {
            setError('Nom et email sont requis')
            return
        }

        try {
            setActionLoading('create')
            setError(null)
            
            await adminAPI.createAgent({
                name: newAgent.name,
                email: newAgent.email,
                skills: newAgent.skills,
                maxConcurrentSessions: newAgent.maxConcurrentSessions
            })

            // Reset formulaire
            setNewAgent({ name: '', email: '', skills: [], maxConcurrentSessions: 5 })
            setShowCreateModal(false)
            
            // Recharger la liste
            await loadAgents()

        } catch (err) {
            setError(translateError(err))
        } finally {
            setActionLoading(null)
        }
    }

    // 🔥 SUSPENDRE UN AGENT
    const handleSuspendAgent = async (agentId: string, reason?: string) => {
        try {
            setActionLoading(`suspend-${agentId}`)
            setError(null)
            
            await adminAPI.suspendAgent(agentId, reason)
            await loadAgents()

        } catch (err) {
            setError(translateError(err))
        } finally {
            setActionLoading(null)
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
    }

    if (loading && !data) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header avec actions */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-black dark:text-white">Agents Support</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Gestion complète des agents support</p>
                </div>
                
                <div className="flex gap-3">
                    <button
                        onClick={() => {/* Exporter */}}
                        className="px-4 py-2 text-black dark:text-white bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors font-medium flex items-center gap-2"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Exporter
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Nouvel agent
                    </button>
                </div>
            </div>

            {/* Erreurs */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-200 p-4 rounded-lg flex justify-between items-start">
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-700 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Contenu principal */}
            <div className="bg-white dark:bg-black rounded-lg shadow-md border border-gray-300 dark:border-gray-700">
                <div className="border-b border-gray-300 dark:border-gray-700 p-6">
                    <nav className="flex gap-6">
                        {[
                            { id: 'all', label: 'Tous les agents', count: data?.total || 0 },
                            { id: 'available', label: 'Disponibles', count: data?.items?.filter(a => a.status === 'available').length || 0 },
                            { id: 'sessions', label: 'Sessions actives', count: data?.items?.reduce((sum, a) => sum + a.currentSessions, 0) || 0 },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb-3 px-2 border-b-2 font-medium transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-black dark:border-white text-black dark:text-white'
                                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            >
                                {tab.label}
                                <span className="ml-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'all' && (
                        <div className="space-y-4">
                            {/* Recherche */}
                            <form onSubmit={handleSearch} className="flex gap-4">
                                <input
                                    type="text"
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Rechercher un agent..."
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium"
                                >
                                    {loading ? 'Recherche...' : 'Rechercher'}
                                </button>
                            </form>

                            {/* Tableau des agents */}
                            <AgentsTable 
                                agents={data?.items || []}
                                loading={loading}
                                onSuspend={handleSuspendAgent}
                                actionLoading={actionLoading}
                            />
                        </div>
                    )}

                    {activeTab === 'sessions' && (
                        <div className="text-center py-8">
                            <h3 className="text-lg font-medium text-black dark:text-white">Sessions Actives</h3>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">Gestion des sessions en cours</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modale création agent */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-black rounded-lg p-6 w-full max-w-md border border-gray-300 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">Créer un nouvel agent</h3>
                        <form onSubmit={handleCreateAgent} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nom complet *"
                                value={newAgent.name}
                                onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white"
                                required
                            />
                            <input
                                type="email"
                                placeholder="Email *"
                                value={newAgent.email}
                                onChange={(e) => setNewAgent(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white"
                                required
                            />
                            <input
                                type="number"
                                placeholder="Sessions simultanées max"
                                value={newAgent.maxConcurrentSessions}
                                onChange={(e) => setNewAgent(prev => ({ ...prev, maxConcurrentSessions: parseInt(e.target.value) }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white"
                                min="1"
                                max="20"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={actionLoading === 'create'}
                                    className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium"
                                >
                                    {actionLoading === 'create' ? 'Création...' : 'Créer l\'agent'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-800 text-black dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors font-medium"
                                >
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}