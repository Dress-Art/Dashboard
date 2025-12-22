'use client'

import { useState, useEffect } from 'react'
import { ClientsTable } from './ClientsTable'
import { PlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { coutureAPI } from '@/lib/couture-api'

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
    notes?: string
}

export function CoutureClientsPage() {
    const [q, setQ] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<{
        items: ClientEntity[]
        total: number
    } | null>(null)

    const [activeTab, setActiveTab] = useState('all')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const [newClient, setNewClient] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postal_code: ''
    })

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

    const loadClients = async () => {
        try {
            setLoading(true)
            setError(null)

            const result = await coutureAPI.listClients({ search: q.trim() })
            
            setData({
                items: result.clients || [],
                total: result.total || 0
            })

        } catch (err) {
            console.error('Erreur chargement clients:', err)
            setError(translateError(err))
            
            setData({
                items: [],
                total: 0
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadClients()
    }, [q])

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!newClient.name || !newClient.email || !newClient.phone) {
            setError('Les champs nom, email et téléphone sont requis')
            return
        }

        try {
            setActionLoading('create')
            setError(null)
            
            await coutureAPI.createClient(newClient)

            setNewClient({ name: '', email: '', phone: '', address: '', city: '', postal_code: '' })
            setShowCreateModal(false)
            await loadClients()

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
                        <div key={`skeleton-${i}`} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-black dark:text-white">Clients Couture</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Gestion des clients et commandes de couture</p>
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
                        Nouveau client
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

            {/* Contenu */}
            <div className="bg-white dark:bg-black rounded-lg shadow-md border border-gray-300 dark:border-gray-700">
                <div className="border-b border-gray-300 dark:border-gray-700 p-6">
                    <nav className="flex gap-6">
                        {[
                            { id: 'all', label: 'Tous les clients', count: data?.total || 0 },
                            { id: 'active', label: 'Actifs', count: data?.items?.filter(c => c.status === 'active').length || 0 },
                            { id: 'inactive', label: 'Inactifs', count: data?.items?.filter(c => c.status === 'inactive').length || 0 },
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
                                    placeholder="Rechercher un client..."
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

                            {/* Tableau */}
                            <ClientsTable 
                                clients={data?.items || []}
                                loading={loading}
                                actionLoading={actionLoading}
                            />
                        </div>
                    )}

                    {activeTab === 'active' && (
                        <div className="text-center py-8">
                            <h3 className="text-lg font-medium text-black dark:text-white">Clients actifs</h3>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">Clients avec commandes en cours</p>
                        </div>
                    )}

                    {activeTab === 'inactive' && (
                        <div className="text-center py-8">
                            <h3 className="text-lg font-medium text-black dark:text-white">Clients inactifs</h3>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">Clients sans activité récente</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modale création */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-black rounded-lg p-6 w-full max-w-md border border-gray-300 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">Ajouter un client</h3>
                        <form onSubmit={handleCreateClient} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nom complet *"
                                value={newClient.name}
                                onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white"
                                required
                            />
                            <input
                                type="email"
                                placeholder="Email *"
                                value={newClient.email}
                                onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white"
                                required
                            />
                            <input
                                type="tel"
                                placeholder="Téléphone *"
                                value={newClient.phone}
                                onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white"
                                required
                            />
                            <input
                                type="text"
                                placeholder="Adresse"
                                value={newClient.address}
                                onChange={(e) => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white"
                            />
                            <input
                                type="text"
                                placeholder="Ville"
                                value={newClient.city}
                                onChange={(e) => setNewClient(prev => ({ ...prev, city: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white"
                            />
                            <input
                                type="text"
                                placeholder="Code postal"
                                value={newClient.postal_code}
                                onChange={(e) => setNewClient(prev => ({ ...prev, postal_code: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={actionLoading === 'create'}
                                    className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium"
                                >
                                    {actionLoading === 'create' ? 'Création...' : 'Créer'}
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
