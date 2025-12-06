'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { adminAPI } from '@/lib/admin-api'
import { DeliveryTable } from './DeliveryTable'

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

/**
 * DeliveryPage
 * Page dédiée Livraisons avec gestion complète des livraisons.
 */
export function DeliveryPage() {
    const [q, setQ] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<{
        items: DeliveryEntity[]
        total: number
    } | null>(null)

    // États pour les onglets et modales
    const [activeTab, setActiveTab] = useState('all')
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [selectedDelivery, setSelectedDelivery] = useState<DeliveryEntity | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    // Données pour l'assignation
    const [availableDrivers, setAvailableDrivers] = useState<any[]>([])
    const [assignForm, setAssignForm] = useState({
        driverId: '',
        priority: 'normal' as const,
        estimatedTime: '',
        notes: ''
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

    // 🔥 FONCTION PRINCIPALE: Charger TOUTES les livraisons
    const loadDeliveries = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await adminAPI.getDeliveries({
                ...(q.trim() && { search: q.trim() })
            })

            setData({
                items: response.deliveries || [],
                total: response.total || 0
            })

        } catch (err) {
            console.error('Erreur chargement livraisons:', err)
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
        loadDeliveries()
    }, [q])

    // 🔥 ASSIGNER UNE LIVRAISON
    const handleAssignDelivery = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!selectedDelivery || !assignForm.driverId) {
            setError('Veuillez sélectionner un livreur')
            return
        }

        try {
            setActionLoading('assign')
            setError(null)
            
            await adminAPI.assignDelivery({
                orderId: selectedDelivery.orderId,
                driverId: assignForm.driverId,
                priority: assignForm.priority,
                estimatedTime: assignForm.estimatedTime
            })

            // Reset formulaire
            setAssignForm({ driverId: '', priority: 'normal', estimatedTime: '', notes: '' })
            setShowAssignModal(false)
            setSelectedDelivery(null)
            
            // Recharger la liste
            await loadDeliveries()

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
                    Livraisons
                    <span className="text-sm font-normal text-gray-500 ml-2">
                        Gestion complète des livraisons
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
                        onClick={() => {/* Vue carte */}}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        🗺️ Vue carte
                    </button>
                    <button
                        onClick={() => setShowAssignModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        📦 Assigner livraison
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
                            { id: 'all', label: 'Toutes les livraisons', count: data?.total || 0 },
                            { id: 'pending', label: 'En attente', count: data?.items?.filter(d => d.status === 'pending').length || 0 },
                            { id: 'in_transit', label: 'En cours', count: data?.items?.filter(d => d.status === 'in_transit').length || 0 },
                            { id: 'tracking', label: 'Suivi temps réel', count: null }
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
                                    placeholder="Rechercher une livraison..."
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

                            {/* Tableau des livraisons */}
                            <DeliveryTable 
                                deliveries={data?.items || []}
                                loading={loading}
                                onAssign={(delivery) => {
                                    setSelectedDelivery(delivery)
                                    setShowAssignModal(true)
                                }}
                                actionLoading={actionLoading}
                            />
                        </div>
                    )}

                    {activeTab === 'tracking' && (
                        <div>
                            <h3 className="text-lg font-medium mb-4">Suivi Temps Réel</h3>
                            {/* Interface de suivi en temps réel avec carte */}
                        </div>
                    )}
                </div>
            </div>

            {/* Modale assignation livraison */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                            Assigner une livraison
                        </h3>
                        <form onSubmit={handleAssignDelivery} className="space-y-4">
                            <select
                                value={assignForm.driverId}
                                onChange={(e) => setAssignForm(prev => ({ ...prev, driverId: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required
                            >
                                <option value="">Sélectionner un livreur</option>
                                {/* Liste des livreurs disponibles */}
                            </select>
                            <select
                                value={assignForm.priority}
                                onChange={(e) => setAssignForm(prev => ({ ...prev, priority: e.target.value as any }))}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="low">Priorité basse</option>
                                <option value="normal">Priorité normale</option>
                                <option value="high">Priorité haute</option>
                                <option value="urgent">Urgent</option>
                            </select>
                            <input
                                type="datetime-local"
                                value={assignForm.estimatedTime}
                                onChange={(e) => setAssignForm(prev => ({ ...prev, estimatedTime: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Heure estimée"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={actionLoading === 'assign'}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {actionLoading === 'assign' ? 'Assignation...' : 'Assigner'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAssignModal(false)}
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