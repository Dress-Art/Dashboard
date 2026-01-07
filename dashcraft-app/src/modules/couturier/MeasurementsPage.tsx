'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { coutureAPI } from '@/lib/couture-api'
import { MeasurementsTable } from './MeasurementsTable'

interface MeasurementEntity {
    id: string
    client_name: string
    measurement_name: string
    value: number
    unit: string
    created_at: string
}

interface ClientEntity {
    id: string
    name: string
}

export function MeasurementsPage() {
    const [q, setQ] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<{
        items: MeasurementEntity[]
        total: number
    } | null>(null)
    const [clients, setClients] = useState<ClientEntity[]>([])

    const [showCreateModal, setShowCreateModal] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const [newMeasurement, setNewMeasurement] = useState({
        client_id: '',
        name: '',
        value: 0,
        unit: 'cm'
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

    const loadData = async () => {
        try {
            setLoading(true)
            setError(null)

            const [measurementsResult, clientsResult] = await Promise.all([
                coutureAPI.listMeasurements({ search: q.trim() }),
                coutureAPI.listClients()
            ])
            
            setData({
                items: measurementsResult.measurements || [],
                total: measurementsResult.total || 0
            })
            setClients(clientsResult.clients || [])

        } catch (err) {
            console.error('Erreur chargement mesures:', err)
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
        loadData()
    }, [q])

    const handleCreateMeasurement = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!newMeasurement.client_id || !newMeasurement.name || newMeasurement.value <= 0) {
            setError('Client, nom de la mesure et une valeur valide sont requis')
            return
        }

        try {
            setActionLoading('create')
            setError(null)
            
            await coutureAPI.createMeasurement(newMeasurement)

            setNewMeasurement({ client_id: '', name: '', value: 0, unit: 'cm' })
            setShowCreateModal(false)
            await loadData()

        } catch (err) {
            setError(translateError(err))
        } finally {
            setActionLoading(null)
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        loadData()
    }

    if (loading && !data) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-10 bg-gray-700 rounded"></div>
                    <div className="h-16 bg-gray-700 rounded"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Liste des Mesures</h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => {/* Exporter */}}
                        className="px-4 py-2 text-white bg-black border border-gray-700 rounded-lg hover:bg-gray-900 transition-colors font-medium flex items-center gap-2"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Exporter
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Nouvelle mesure
                    </button>
                </div>
            </div>

            {/* Erreurs */}
            {error && (
                <div className="bg-red-900/20 border border-red-700 text-red-200 p-4 rounded-lg flex justify-between items-start">
                    <span>{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-200 hover:text-red-100"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Contenu */}
            <div className="bg-black rounded-lg shadow-sm border border-gray-800 p-6">
                <div className="space-y-4">
                    {/* Recherche */}
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <input
                            type="text"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Rechercher une mesure..."
                            className="flex-1 px-4 py-2 border border-gray-700 rounded-lg bg-transparent text-white placeholder-gray-500"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-white text-black rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium"
                        >
                            {loading ? 'Recherche...' : 'Rechercher'}
                        </button>
                    </form>

                    {/* Tableau */}
                    <MeasurementsTable 
                        measurements={data?.items || []}
                        loading={loading}
                        actionLoading={actionLoading}
                    />
                </div>
            </div>

            {/* Modale création */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-black rounded-lg p-6 w-full max-w-md border border-gray-800 shadow-xl">
                        <h3 className="text-lg font-semibold mb-4 text-white">Ajouter une mesure</h3>
                        <form onSubmit={handleCreateMeasurement} className="space-y-4">
                            <select
                                value={newMeasurement.client_id}
                                onChange={(e) => setNewMeasurement(prev => ({ ...prev, client_id: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-transparent text-white"
                                required
                            >
                                <option value="">Sélectionner un client</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="Nom de la mesure (ex: Tour de taille) *"
                                value={newMeasurement.name}
                                onChange={(e) => setNewMeasurement(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-700 rounded-lg bg-transparent text-white"
                                required
                            />
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Valeur *"
                                    value={newMeasurement.value}
                                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                                    className="w-2/3 px-4 py-2 border border-gray-700 rounded-lg bg-transparent text-white"
                                    required
                                />
                                <select
                                    value={newMeasurement.unit}
                                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, unit: e.target.value }))}
                                    className="w-1/3 px-4 py-2 border border-gray-700 rounded-lg bg-transparent text-white"
                                >
                                    <option value="cm">cm</option>
                                    <option value="in">in</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 bg-black text-white border border-gray-700 rounded-lg hover:bg-gray-900 font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading === 'create'}
                                    className="flex-1 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium"
                                >
                                    {actionLoading === 'create' ? 'Création...' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
