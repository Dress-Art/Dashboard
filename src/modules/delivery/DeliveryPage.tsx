'use client'

import {useState, useEffect, useCallback, useMemo} from 'react'
import {
    listDeliveries,
    assignDelivery,
    updateDeliveryStatus,
    type DeliveryRow,
} from '@/lib/deliveries-api'
import {listDriversForAssignment, type DriverEntry} from '@/app/actions/drivers'
import {notify} from '@/lib/toast'
import {DeliveryTable, type DeliveryEntity} from './DeliveryTable'
import {CheckIcon, ArrowDownTrayIcon} from '@heroicons/react/24/outline'
import {
    type DeliveryStatus,
    DELIVERY_STATUS_LABELS_FR,
    isDeliveryTerminal,
} from '@/types/delivery.types'

function rowToEntity(row: DeliveryRow, drivers: DriverEntry[]): DeliveryEntity {
    const driver = row.driver_id ? drivers.find(d => d.id === row.driver_id) : undefined
    return {
        id: row.id,
        orderId: row.order_id,
        customerName: row.customer_name,
        customerAddress: row.customer_address,
        customerPhone: row.customer_phone ?? undefined,
        driverId: row.driver_id ?? undefined,
        driverName: driver?.name,
        status: row.status,
        priority: row.priority,
        estimatedTime: row.estimated_time ?? undefined,
        actualDeliveryTime: row.actual_delivery_time ?? undefined,
        created_at: row.created_at,
        assigned_at: row.assigned_at ?? undefined,
        trackingToken: row.tracking_token,
    }
}

type FilterTab = 'all' | DeliveryStatus

const TABS: ReadonlyArray<{id: FilterTab; label: string}> = [
    {id: 'all', label: 'Toutes'},
    {id: 'pending', label: 'En attente'},
    {id: 'assigned', label: 'Assignées'},
    {id: 'in_transit', label: 'En transit'},
    {id: 'delivered', label: 'Livrées'},
]

interface AssignFormState {
    driverId: string
    priority: 'low' | 'normal' | 'high' | 'urgent'
    estimatedTime: string
    notes: string
}

const EMPTY_ASSIGN_FORM: AssignFormState = {
    driverId: '',
    priority: 'normal',
    estimatedTime: '',
    notes: '',
}

export function DeliveryPage() {
    const [q, setQ] = useState('')
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<{items: DeliveryEntity[]; total: number} | null>(null)

    const [activeTab, setActiveTab] = useState<FilterTab>('all')
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [selectedDelivery, setSelectedDelivery] = useState<DeliveryEntity | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const [availableDrivers, setAvailableDrivers] = useState<DriverEntry[]>([])
    const [assignForm, setAssignForm] = useState<AssignFormState>(EMPTY_ASSIGN_FORM)

    // Charger les livreurs disponibles (1 fois au montage)
    useEffect(() => {
        listDriversForAssignment()
            .then(res => {
                if (res.success) setAvailableDrivers(res.drivers)
                else console.error('Erreur chargement livreurs:', res.error)
            })
            .catch(err => console.error('Erreur chargement livreurs:', err))
    }, [])

    const loadDeliveries = useCallback(async () => {
        try {
            setLoading(true)
            const {deliveries, total} = await listDeliveries({
                ...(q.trim() && {search: q.trim()}),
            })
            const items = deliveries.map(row => rowToEntity(row, availableDrivers))
            setData({items, total})
        } catch (err) {
            console.error('Erreur chargement livraisons:', err)
            notify.error(err)
            setData({items: [], total: 0})
        } finally {
            setLoading(false)
        }
    }, [q, availableDrivers])

    useEffect(() => {
        loadDeliveries()
    }, [loadDeliveries])

    // Filtre + counts dérivés
    const filtered = useMemo(() => {
        const items = data?.items ?? []
        if (activeTab === 'all') return items
        return items.filter(d => d.status === activeTab)
    }, [data, activeTab])

    const counts = useMemo(() => {
        const items = data?.items ?? []
        return {
            all: items.length,
            pending: items.filter(d => d.status === 'pending').length,
            assigned: items.filter(d => d.status === 'assigned').length,
            picked_up: items.filter(d => d.status === 'picked_up').length,
            in_transit: items.filter(d => d.status === 'in_transit').length,
            delivered: items.filter(d => d.status === 'delivered').length,
            cancelled: items.filter(d => d.status === 'cancelled').length,
        } as Record<FilterTab, number>
    }, [data])

    // Handler "Assigner" : pending → assigned (via modale)
    const openAssignModal = (delivery: DeliveryEntity | null) => {
        setSelectedDelivery(delivery)
        setAssignForm(EMPTY_ASSIGN_FORM)
        setShowAssignModal(true)
    }

    const handleAssignSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedDelivery || !assignForm.driverId) {
            notify.error('Sélectionnez un livreur')
            return
        }
        try {
            setActionLoading(`assign-${selectedDelivery.id}`)
            await assignDelivery(selectedDelivery.id, {
                driverId: assignForm.driverId,
                priority: assignForm.priority,
                estimatedTime: assignForm.estimatedTime || null,
            })
            notify.success(
                `Livraison #${selectedDelivery.orderId}`,
                `Assignée à ${availableDrivers.find(d => d.id === assignForm.driverId)?.name ?? 'livreur'}`,
            )
            setShowAssignModal(false)
            setSelectedDelivery(null)
            setAssignForm(EMPTY_ASSIGN_FORM)
            await loadDeliveries()
        } catch (err) {
            notify.error(err)
        } finally {
            setActionLoading(null)
        }
    }

    // Handler "étape suivante" : assigned → picked_up → in_transit → delivered
    const handleAdvance = async (delivery: DeliveryEntity, next: DeliveryStatus) => {
        try {
            setActionLoading(`advance-${delivery.id}`)
            await updateDeliveryStatus(delivery.id, next)
            notify.success(
                `Livraison #${delivery.orderId}`,
                `→ ${DELIVERY_STATUS_LABELS_FR[next]}`,
            )
            await loadDeliveries()
        } catch (err) {
            notify.error(err)
        } finally {
            setActionLoading(null)
        }
    }

    // Handler "Annuler"
    const handleCancel = async (delivery: DeliveryEntity) => {
        if (isDeliveryTerminal(delivery.status)) return
        try {
            setActionLoading(`cancel-${delivery.id}`)
            await updateDeliveryStatus(delivery.id, 'cancelled')
            notify.success(`Livraison #${delivery.orderId}`, 'Annulée')
            await loadDeliveries()
        } catch (err) {
            notify.error(err)
        } finally {
            setActionLoading(null)
        }
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
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-black dark:text-white">Livraisons</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Gestion complète des livraisons</p>
                </div>
                <div className="flex gap-3">
                    <button
                        disabled
                        className="px-4 py-2 text-black dark:text-white bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-40 transition-colors font-medium flex items-center gap-2"
                        title="Bientôt"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Exporter
                    </button>
                    <button
                        onClick={() => openAssignModal(null)}
                        disabled={availableDrivers.length === 0}
                        className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium flex items-center gap-2"
                        title={availableDrivers.length === 0 ? 'Aucun livreur (créez un user role=livreur)' : ''}
                    >
                        <CheckIcon className="w-4 h-4" />
                        Assigner
                    </button>
                </div>
            </div>

            {/* Onglets statut (filtrent réellement maintenant) */}
            <div className="bg-white dark:bg-black rounded-lg shadow-md border border-gray-300 dark:border-gray-700">
                <div className="border-b border-gray-300 dark:border-gray-700 px-6">
                    <nav className="flex gap-6">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-black dark:border-white text-black dark:text-white'
                                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            >
                                {tab.label}
                                <span className="ml-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
                                    {counts[tab.id]}
                                </span>
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6 space-y-4">
                    {/* Recherche */}
                    <form
                        onSubmit={e => {
                            e.preventDefault()
                            loadDeliveries()
                        }}
                        className="flex gap-4"
                    >
                        <input
                            type="text"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Rechercher (numéro, client, livreur)..."
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white placeholder-gray-500"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 font-medium"
                        >
                            {loading ? 'Recherche...' : 'Rechercher'}
                        </button>
                    </form>

                    <DeliveryTable
                        deliveries={filtered}
                        loading={loading}
                        onAssign={openAssignModal}
                        onAdvance={handleAdvance}
                        onCancel={handleCancel}
                        actionLoading={actionLoading}
                    />
                </div>
            </div>

            {/* Modale Assigner */}
            {showAssignModal && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowAssignModal(false)}
                >
                    <div
                        className="bg-white dark:bg-black rounded-lg p-6 w-full max-w-md border border-gray-300 dark:border-gray-700"
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">
                            Assigner une livraison
                            {selectedDelivery && <span className="text-sm text-gray-500 ml-2">#{selectedDelivery.orderId}</span>}
                        </h3>
                        <form onSubmit={handleAssignSubmit} className="space-y-4">
                            <select
                                value={assignForm.driverId}
                                onChange={e => setAssignForm(prev => ({...prev, driverId: e.target.value}))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white"
                                required
                            >
                                <option value="">Sélectionner un livreur</option>
                                {availableDrivers.length === 0 && (
                                    <option value="" disabled>
                                        Aucun livreur (créez un user avec role=&quot;livreur&quot;)
                                    </option>
                                )}
                                {availableDrivers.map(driver => (
                                    <option key={driver.id} value={driver.id}>
                                        {driver.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={assignForm.priority}
                                onChange={e =>
                                    setAssignForm(prev => ({...prev, priority: e.target.value as AssignFormState['priority']}))
                                }
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
                                onChange={e => setAssignForm(prev => ({...prev, estimatedTime: e.target.value}))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAssignModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-800 text-black dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading?.startsWith('assign-')}
                                    className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium"
                                >
                                    {actionLoading?.startsWith('assign-') ? 'Assignation...' : 'Assigner'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
