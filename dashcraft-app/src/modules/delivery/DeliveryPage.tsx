'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { adminAPI } from '@/lib/admin-api'
import { DeliveryTable } from './DeliveryTable'
import { CheckIcon, MapIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

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
                <div>
                    <h1 className="text-3xl font-bold text-black dark:text-white">Livraisons</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Gestion complète des livraisons</p>
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
                        onClick={() => {/* Vue carte */}}
                        className="px-4 py-2 text-black dark:text-white bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors font-medium flex items-center gap-2"
                    >
                        <MapIcon className="w-4 h-4" />
                        Vue carte
                    </button>
                    <button
                        onClick={() => setShowAssignModal(true)}
                        className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
                    >
                        <CheckIcon className="w-4 h-4" />
                        Assigner
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
                            { id: 'all', label: 'Toutes les livraisons', count: data?.total || 0 },
                            { id: 'pending', label: 'En attente', count: data?.items?.filter(d => d.status === 'pending').length || 0 },
                            { id: 'in_transit', label: 'En cours', count: data?.items?.filter(d => d.status === 'in_transit').length || 0 },
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
                                    placeholder="Rechercher une livraison..."
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

                    {activeTab === 'pending' && (
                        <div className="text-center py-8">
                            <h3 className="text-lg font-medium text-black dark:text-white">Livraisons en attente</h3>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">Assignez des livreurs à ces commandes</p>
                        </div>
                    )}

                    {activeTab === 'in_transit' && (
                        <div className="text-center py-8">
                            <h3 className="text-lg font-medium text-black dark:text-white">Livraisons en cours</h3>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">Suivez les livraisons en temps réel</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modale assignation livraison */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-black rounded-lg p-6 w-full max-w-md border border-gray-300 dark:border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">Assigner une livraison</h3>
                        <form onSubmit={handleAssignDelivery} className="space-y-4">
                            <select
                                value={assignForm.driverId}
                                onChange={(e) => setAssignForm(prev => ({ ...prev, driverId: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white"
                                required
                            >
                                <option value="">Sélectionner un livreur</option>
                                {availableDrivers.map((driver: any) => (
                                    <option key={driver.id} value={driver.id}>
                                        {driver.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={assignForm.priority}
                                onChange={(e) => setAssignForm(prev => ({ ...prev, priority: e.target.value as any }))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white"
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
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white"
                                placeholder="Heure estimée"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={actionLoading === 'assign'}
                                    className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium"
                                >
                                    {actionLoading === 'assign' ? 'Assignation...' : 'Assigner'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAssignModal(false)}
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