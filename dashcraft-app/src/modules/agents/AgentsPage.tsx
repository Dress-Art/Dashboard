'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { adminAPI } from '@/lib/admin-api'
import { AgentsTable } from './AgentsTable'

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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Agents Support
                    <span className="text-sm font-normal text-gray-500 ml-2">
                        Gestion complète des agents
                    </span>
                </h1>
                
                <div className="flex space-x-3">
                    <button
                        onClick={() => {/* Exporter */}}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        📊 Exporter
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        + Nouvel agent
                    </button>
                </div>
            </div>

            {/* Erreurs */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-lg flex justify-between items-start">
                    <div className="flex items-start space-x-2">
                        <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 ml-4"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Tabs et contenu */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex space-x-8 px-6">
                        {[
                            { id: 'all', label: 'Tous les agents', count: data?.total || 0 },
                            { id: 'available', label: 'Disponibles', count: data?.items?.filter(a => a.status === 'available').length || 0 },
                            { id: 'sessions', label: 'Sessions actives', count: data?.items?.reduce((sum, a) => sum + a.currentSessions, 0) || 0 },
                            { id: 'performance', label: 'Performances', count: null }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
                                {tab.count !== null && (
                                    <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                                        {tab.count}
                                    </span>
                                )}
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
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                >
                                    {loading ? '⏳' : '🔍'} Rechercher
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
                        <div>
                            <h3 className="text-lg font-medium mb-4">Sessions Actives</h3>
                            {/* Interface de gestion des sessions */}
                        </div>
                    )}

                    {activeTab === 'performance' && (
                        <div>
                            <h3 className="text-lg font-medium mb-4">Performances des Agents</h3>
                            {/* Statistiques et graphiques */}
                        </div>
                    )}
                </div>
            </div>

            {/* Modale création agent */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                            Créer un nouvel agent
                        </h3>
                        <form onSubmit={handleCreateAgent} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nom complet *"
                                value={newAgent.name}
                                onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required
                            />
                            <input
                                type="email"
                                placeholder="Email *"
                                value={newAgent.email}
                                onChange={(e) => setNewAgent(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required
                            />
                            <input
                                type="number"
                                placeholder="Sessions simultanées max"
                                value={newAgent.maxConcurrentSessions}
                                onChange={(e) => setNewAgent(prev => ({ ...prev, maxConcurrentSessions: parseInt(e.target.value) }))}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                min="1"
                                max="20"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={actionLoading === 'create'}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {actionLoading === 'create' ? 'Création...' : 'Créer l\'agent'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
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