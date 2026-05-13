'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { adminAPI } from '@/lib/admin-api'
import { useAuthContext } from '@/contexts/AuthContext'
import { notify } from '@/lib/toast'
import { listTissus } from '@/lib/tissus-api'
import { createDeliveryFromOrderAction } from '@/app/actions/deliveries'
import { remindCouturierAction, resolveOrderProfessionalsAction, acceptCouturierSuggestionAction, revokeCouturierSuggestionAction, listCouturiersAction, manualAssignCouturierAction, getOrdersDirectAction } from '@/app/actions/orders'
import {
    type OrderStatus,
    type OrderPaymentStatus,
    type OrderMeasurements,
    ORDER_STATUS_LABELS_FR,
    NEXT_STATUS,
} from '@/types/order.types'

interface Order {
    id: string
    orderNumber: string
    date: string
    status: OrderStatus
    paymentStatus: OrderPaymentStatus
    modelName: string
    fabricName: string
    totalAmount: number
    paidAmount: number
    customerName: string
    customerPhone: string
    customerEmail?: string
    appointmentDate?: string
    location?: string
    model_id?: string | null
    /** Mesures snapshotées sur la commande (clé = nom mesure, valeur = {value,unit}). */
    measurements?: OrderMeasurements | null
    /**
     * Champs dénormalisés attendus du backend marketplace pour le filtrage par rôle.
     * Couturier filtre via `professional_id` (joint depuis `modeles.professional_id`).
     * Agent filtre via `created_by_agent_id` (joint depuis `clients.created_by_agent_id`).
     * Vendeur filtre via `fabric_id` (∈ ses propres tissus).
     * Si absents → le rôle non-admin verra une liste vide (mode dégradé safe).
     */
    professional_id?: string
    created_by_agent_id?: string
    fabric_id?: string
}

/**
 * Compat : si le backend marketplace renvoie encore les anciens statuts
 * (`in_progress`, `completed`), on les normalise au vol pour ne pas péter
 * l'UI tant que sa migration n'est pas déployée.
 */
function normalizeStatus(s: string): OrderStatus {
    if (s === 'in_progress') return 'sewing'
    if (s === 'completed') return 'delivered'
    return s as OrderStatus
}

const STATUS_COLORS: Record<OrderStatus, string> = {
    confirmed: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    paid: 'bg-blue-100 text-blue-800 border border-blue-200',
    measurements_validated: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    sewing: 'bg-purple-100 text-purple-800 border border-purple-200',
    finishing: 'bg-pink-100 text-pink-800 border border-pink-200',
    ready_for_delivery: 'bg-teal-100 text-teal-800 border border-teal-200',
    delivered: 'bg-green-100 text-green-800 border border-green-200',
    cancelled: 'bg-red-100 text-red-800 border border-red-200',
}

const PAYMENT_LABELS: Record<OrderPaymentStatus, string> = {
    paid: 'Payé',
    partial: 'Acompte',
    pending: 'En attente',
}

const PAYMENT_COLORS: Record<OrderPaymentStatus, string> = {
    paid: 'bg-green-100 text-green-800',
    partial: 'bg-blue-100 text-blue-800',
    pending: 'bg-gray-100 text-gray-700',
}

const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
    confirmed: 'Marquer payé',
    paid: 'Valider mesures',
    measurements_validated: 'Démarrer couture',
    sewing: 'Passer aux finitions',
    finishing: 'Prêt pour livraison',
    ready_for_delivery: 'Marquer livré',
}

function formatReminderError(error: string | null | undefined): string {
    if (!error) return 'Impossible d\'envoyer le rappel'
    if (error === 'unauthorized') return 'Session expirée. Reconnectez-vous.'
    if (error === 'forbidden') return 'Action réservée à un administrateur.'
    if (error === 'no_couturier_linked') return 'Aucun couturier rattaché à cette commande.'
    if (error === 'couturier_not_found') return 'Couturier introuvable dans les comptes.'
    if (error === 'couturier_phone_missing') return 'Le couturier n\'a pas de numéro de téléphone.'
    if (error.startsWith('evolution_')) return `Relance WhatsApp échouée (${error})`
    return `Relance WhatsApp échouée (${error})`
}

/** Onglets de filtrage (regroupement métier des 8 statuts). */
const STATUS_TABS: ReadonlyArray<{id: 'all' | OrderStatus; label: string}> = [
    {id: 'all', label: 'Toutes'},
    {id: 'confirmed', label: 'Confirmées'},
    {id: 'sewing', label: 'En couture'},
    {id: 'ready_for_delivery', label: 'Prêtes'},
    {id: 'delivered', label: 'Livrées'},
    {id: 'cancelled', label: 'Annulées'},
] as const

/** États terminaux : pas de transitions possibles. */
function isTerminal(status: OrderStatus): boolean {
    return status === 'delivered' || status === 'cancelled'
}

interface MeasurementsBlockProps {
    measurements: OrderMeasurements | null | undefined
    onEdit?: () => void
}

function MeasurementsBlock({measurements, onEdit}: MeasurementsBlockProps) {
    const entries = measurements ? Object.entries(measurements) : []
    return (
        <div className="mt-4 bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-400">
                    {entries.length === 0 ? 'Mesures' : `Mesures (${entries.length})`}
                </p>
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="text-xs font-medium text-black dark:text-white hover:underline"
                    >
                        {entries.length === 0 ? 'Saisir' : 'Modifier'}
                    </button>
                )}
            </div>
            {entries.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Aucune mesure enregistrée pour cette commande.</p>
            ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                    {entries.map(([name, m]) => (
                        <div key={name} className="flex justify-between bg-white dark:bg-black rounded-lg px-3 py-1.5">
                            <span className="text-gray-600 dark:text-gray-400 capitalize">{name.replace(/_/g, ' ')}</span>
                            <span className="font-medium text-black dark:text-white tabular-nums">
                                {m.value} {m.unit}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// Modèle de mesures par défaut quand la commande n'en a pas (template couture).
const DEFAULT_MEASUREMENTS: ReadonlyArray<{name: string; unit: 'cm' | 'in'}> = [
    {name: 'tour_poitrine', unit: 'cm'},
    {name: 'tour_taille', unit: 'cm'},
    {name: 'tour_hanches', unit: 'cm'},
    {name: 'longueur_manche', unit: 'cm'},
    {name: 'longueur_dos', unit: 'cm'},
] as const

interface MeasurementsEditModalProps {
    initial: OrderMeasurements | null | undefined
    onClose: () => void
    onSave: (measurements: OrderMeasurements) => Promise<void>
    submitting: boolean
}

function MeasurementsEditModal({initial, onClose, onSave, submitting}: MeasurementsEditModalProps) {
    type Row = {name: string; value: string; unit: 'cm' | 'in'}
    const seed: Row[] = (() => {
        const entries = initial ? Object.entries(initial) : []
        if (entries.length > 0) {
            return entries.map(([name, m]) => ({
                name,
                value: String(m.value ?? ''),
                unit: (m.unit as 'cm' | 'in') ?? 'cm',
            }))
        }
        return DEFAULT_MEASUREMENTS.map(d => ({name: d.name, value: '', unit: d.unit}))
    })()

    const [rows, setRows] = useState<Row[]>(seed)

    const update = (i: number, patch: Partial<Row>) => {
        setRows(prev => prev.map((r, idx) => (idx === i ? {...r, ...patch} : r)))
    }
    const remove = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i))
    const add = () => setRows(prev => [...prev, {name: '', value: '', unit: 'cm'}])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const measurements: OrderMeasurements = {}
        for (const r of rows) {
            const name = r.name.trim().toLowerCase().replace(/\s+/g, '_')
            const value = parseFloat(r.value)
            if (!name || !Number.isFinite(value)) continue
            measurements[name] = {value, unit: r.unit}
        }
        if (Object.keys(measurements).length === 0) {
            notify.error('Saisissez au moins une mesure valide')
            return
        }
        await onSave(measurements)
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-950 rounded-2xl p-6 w-full max-w-lg border border-gray-200 dark:border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-black dark:text-white">Mesures de la commande</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-xl">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    {rows.map((row, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <input
                                type="text"
                                placeholder="Nom (ex: tour_taille)"
                                value={row.name}
                                onChange={e => update(i, {name: e.target.value})}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white text-sm"
                            />
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="Valeur"
                                value={row.value}
                                onChange={e => update(i, {value: e.target.value})}
                                className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white text-sm tabular-nums"
                            />
                            <select
                                value={row.unit}
                                onChange={e => update(i, {unit: e.target.value as 'cm' | 'in'})}
                                className="px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white text-sm"
                            >
                                <option value="cm">cm</option>
                                <option value="in">in</option>
                            </select>
                            <button
                                type="button"
                                onClick={() => remove(i)}
                                className="px-2 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                aria-label="Supprimer la ligne"
                            >
                                ✕
                            </button>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={add}
                        className="w-full py-2 border border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:border-gray-500 hover:text-black dark:hover:text-white text-sm font-medium"
                    >
                        + Ajouter une mesure
                    </button>

                    <div className="flex gap-3 pt-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-black dark:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 font-medium"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 font-semibold"
                        >
                            {submitting ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

interface OrderRowActionsProps {
    order: Order
    updatingId: string | null
    onChange: (order: Order, next: OrderStatus) => void
}

function OrderRowActions({order, updatingId, onChange}: OrderRowActionsProps) {
    const next = NEXT_STATUS[order.status]
    const busy = updatingId === order.orderNumber
    return (
        <div className="flex gap-2 flex-wrap">
            {next && (
                <button
                    onClick={() => onChange(order, next)}
                    disabled={busy}
                    className="px-3 py-1 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                    {busy ? '...' : NEXT_STATUS_LABEL[order.status]}
                </button>
            )}
            {!isTerminal(order.status) && (
                <button
                    onClick={() => onChange(order, 'cancelled')}
                    disabled={busy}
                    className="px-3 py-1 border border-red-300 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                    Annuler
                </button>
            )}
        </div>
    )
}

export function OrdersPage() {
    const { user, role } = useAuthContext()
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
    const [editingMeasurements, setEditingMeasurements] = useState(false)
    const [savingMeasurements, setSavingMeasurements] = useState(false)
    const [launchingDeliveryId, setLaunchingDeliveryId] = useState<string | null>(null)
    const [remindingCouturierId, setRemindingCouturierId] = useState<string | null>(null)
    const [professionalNames, setProfessionalNames] = useState<Record<string, string>>({})
    const [couturiers, setCouturiers] = useState<Array<{id: string; name: string; email: string}>>([])
    const [searchCouturier, setSearchCouturier] = useState('')
    const [assigningCouturierId, setAssigningCouturierId] = useState<string | null>(null)

    /**
     * Liste des fabric_id appartenant au vendeur connecté. Chargée 1 fois si
     * role === 'vendeur' pour permettre le filtre `orders.fabric_id ∈ mes tissus`.
     */
    const [vendorFabricIds, setVendorFabricIds] = useState<Set<string>>(new Set())
    useEffect(() => {
        if (role !== 'vendeur' || !user?.id) return
        listTissus({})
            .then(res => {
                const ids = res.tissus.filter(t => t.vendor_id === user.id).map(t => t.id)
                setVendorFabricIds(new Set(ids))
            })
            .catch(err => console.error('Erreur chargement tissus vendeur:', err))
    }, [role, user?.id])

    // Load couturiers list if admin
    useEffect(() => {
        if (role !== 'admin') return
        void (async () => {
            try {
                const res = await listCouturiersAction()
                if (res.success) {
                    setCouturiers(res.couturiers)
                }
            } catch (err) {
                console.error('Failed to load couturiers:', err)
            }
        })()
    }, [role])

    /**
     * Filtre par rôle (côté client). Backend marketplace inchangé pour l'instant.
     * - admin → tout
     * - couturier → orders dont le modèle lui appartient (professional_id)
     * - agent → orders dont le client a été créé par lui (created_by_agent_id)
     * - vendeur → orders utilisant un de ses tissus (fabric_id ∈ vendorFabricIds)
     * - livreur → orders en `ready_for_delivery` ou `delivered`
     */
    const ownedOrders = useMemo(() => {
        if (!role || role === 'admin') return orders
        if (role === 'couturier') {
            return orders.filter(o => o.professional_id && o.professional_id === user?.id)
        }
        if (role === 'agent') {
            return orders.filter(o => o.created_by_agent_id && o.created_by_agent_id === user?.id)
        }
        if (role === 'vendeur') {
            if (vendorFabricIds.size === 0) return []
            return orders.filter(o => o.fabric_id && vendorFabricIds.has(o.fabric_id))
        }
        if (role === 'livreur') {
            return orders.filter(o =>
                o.status === 'ready_for_delivery' || o.status === 'delivered',
            )
        }
        return []
    }, [orders, role, user?.id, vendorFabricIds])

    const isAdmin = role === 'admin'
    /** Vendeur et livreur sont en lecture seule (pas d'action statut/annulation). */
    const isReadOnly = role === 'vendeur' || role === 'livreur'
    const titleKey = isAdmin ? 'Commandes' : 'Mes commandes'
    const subtitleKey = isAdmin
        ? 'Gestion des commandes DressArt'
        : role === 'couturier'
            ? 'Commandes assignées via vos modèles'
            : role === 'agent'
                ? 'Commandes des clients que vous avez ajoutés'
                : role === 'vendeur'
                    ? 'Commandes utilisant vos tissus'
                    : role === 'livreur'
                        ? 'Commandes prêtes pour livraison'
                        : 'Commandes'

    const load = useCallback(async () => {
        try {
            setLoading(true)
            // Load orders directly from local Supabase to get professional_id assignments
            const directResult = await getOrdersDirectAction({ search, status: statusFilter })
            if (!directResult.success) {
                notify.error(directResult.error ?? 'Erreur chargement commandes')
                return
            }
            const raw: Order[] = (directResult.orders ?? []) as Order[]
            const modelIds = raw.map(order => order.model_id).filter(Boolean) as string[]
            const resolved = modelIds.length > 0
                ? await resolveOrderProfessionalsAction({modelIds})
                : {success: true as const, assignments: {} as Record<string, string>, professionalNames: {} as Record<string, string>}

            const professionalAssignments = resolved.success ? resolved.assignments : {}
            const names = resolved.success ? (resolved.professionalNames ?? {}) : {}
            setProfessionalNames(names)
            // Normalize status variants and use professional_id directly from local Supabase
            setOrders(raw.map(o => ({
                ...o,
                status: normalizeStatus(o.status as string),
                // professional_id already populated from local Supabase query
                professional_id: o.professional_id ?? (o.model_id ? professionalAssignments[o.model_id] : undefined),
            })))
        } catch (err) {
            notify.error(err)
        } finally {
            setLoading(false)
        }
    }, [search, statusFilter])

    useEffect(() => { load() }, [load])

    const handleStatusChange = async (order: Order, newStatus: OrderStatus) => {
        setUpdatingId(order.orderNumber)
        try {
            await adminAPI.updateOrderStatus(order.orderNumber, newStatus)
            notify.success(
                `Commande ${order.orderNumber}`,
                `→ ${ORDER_STATUS_LABELS_FR[newStatus]}`,
            )
            await load()
            if (selectedOrder?.orderNumber === order.orderNumber) {
                setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null)
            }
        } catch (err) {
            notify.error(err)
        } finally {
            setUpdatingId(null)
        }
    }

    /** PATCH `orders.measurements` JSONB. Reload + sync de la modale. */
    const handleSaveMeasurements = async (measurements: OrderMeasurements) => {
        if (!selectedOrder) return
        setSavingMeasurements(true)
        try {
            await adminAPI.updateOrderMeasurements(selectedOrder.orderNumber, measurements)
            notify.success(
                `Commande ${selectedOrder.orderNumber}`,
                `${Object.keys(measurements).length} mesure(s) enregistrée(s)`,
            )
            setSelectedOrder(prev => (prev ? {...prev, measurements} : null))
            setEditingMeasurements(false)
            await load()
        } catch (err) {
            notify.error(err)
        } finally {
            setSavingMeasurements(false)
        }
    }

    const handleLaunchDelivery = async (order: Order) => {
        if (order.status !== 'ready_for_delivery') {
            notify.error('Passez la commande en "Prêt pour livraison" avant de lancer la livraison.')
            return
        }

        setLaunchingDeliveryId(order.orderNumber)
        try {
            const result = await createDeliveryFromOrderAction({orderId: order.id})
            if (!result.success) {
                notify.error(result.error ?? 'Impossible de créer la livraison')
                return
            }

            notify.success(
                `Livraison ${order.orderNumber}`,
                result.created ? 'Livraison créée' : 'Livraison déjà existante',
            )
        } catch (err) {
            notify.error(err)
        } finally {
            setLaunchingDeliveryId(null)
        }
    }

    const handleRemindCouturier = async (order: Order) => {
        if (!order.professional_id) {
            notify.error('Aucun couturier rattaché à cette commande.')
            return
        }

        setRemindingCouturierId(order.orderNumber)
        try {
            const result = await remindCouturierAction({
                orderNumber: order.orderNumber,
                professionalId: order.professional_id,
                modelName: order.modelName,
                status: order.status,
            })

            if (!result.success) {
                console.error('remindCouturier failed', {
                    orderNumber: order.orderNumber,
                    professionalId: order.professional_id,
                    error: result.error,
                })
                notify.error(formatReminderError(result.error))
                return
            }

            notify.success(
                `Rappel envoyé`,
                result.skipped ? 'Evolution non configurée, aucune notification n’a été envoyée.' : `Couturier relancé pour ${order.orderNumber}`,
            )
        } catch (err) {
            notify.error(err)
        } finally {
            setRemindingCouturierId(null)
        }
    }

    /** Qui peut éditer les mesures : tout le monde sauf vendeur/livreur, et pas en terminal. */
    const canEditMeasurements = !isReadOnly && selectedOrder
        ? !isTerminal(selectedOrder.status)
        : false

    const filtered = ownedOrders.filter(o =>
        statusFilter === 'all' || o.status === statusFilter
    ).filter(o =>
        !search ||
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName.toLowerCase().includes(search.toLowerCase()) ||
        o.customerPhone.includes(search)
    )

    const counts: Record<'all' | OrderStatus, number> = {
        all: ownedOrders.length,
        confirmed: ownedOrders.filter(o => o.status === 'confirmed').length,
        paid: ownedOrders.filter(o => o.status === 'paid').length,
        measurements_validated: ownedOrders.filter(o => o.status === 'measurements_validated').length,
        sewing: ownedOrders.filter(o => o.status === 'sewing').length,
        finishing: ownedOrders.filter(o => o.status === 'finishing').length,
        ready_for_delivery: ownedOrders.filter(o => o.status === 'ready_for_delivery').length,
        delivered: ownedOrders.filter(o => o.status === 'delivered').length,
        cancelled: ownedOrders.filter(o => o.status === 'cancelled').length,
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-black dark:text-white">{titleKey}</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{subtitleKey}</p>
            </div>

            {/* Onglets statut (regroupement métier des 8 valeurs) */}
            <div className="flex gap-2 flex-wrap">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                            statusFilter === tab.id
                                ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                                : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-900 dark:hover:border-gray-200'
                        }`}
                    >
                        {tab.label}
                        <span className="ml-2 opacity-60 text-xs">{counts[tab.id]}</span>
                    </button>
                ))}
            </div>

            {/* Recherche */}
            <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par numéro, nom, téléphone..."
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-black dark:text-white placeholder-gray-400"
            />

            {/* Tableau */}
            <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="w-8 h-8 border-4 border-gray-300 border-t-black dark:border-t-white rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">Aucune commande trouvée</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                            <tr>
                                {['Commande', 'Client', 'Modèle / Tissu', 'Montant', 'Statut', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                            {filtered.map(order => (
                                <tr
                                    key={order.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-950 cursor-pointer"
                                    onClick={() => setSelectedOrder(order)}
                                >
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-black dark:text-white">{order.orderNumber}</div>
                                        <div className="text-xs text-gray-400">
                                            {new Date(order.date).toLocaleDateString('fr-FR')}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-black dark:text-white">{order.customerName}</div>
                                        <div className="text-xs text-gray-400">{order.customerPhone}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-black dark:text-white">{order.modelName}</div>
                                        <div className="text-xs text-gray-400">{order.fabricName}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-black dark:text-white">
                                            {order.totalAmount.toLocaleString('fr-FR')} FCFA
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${PAYMENT_COLORS[order.paymentStatus]}`}>
                                            {PAYMENT_LABELS[order.paymentStatus]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                                            {ORDER_STATUS_LABELS_FR[order.status]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                        {isReadOnly ? (
                                            <span className="text-xs text-gray-400">—</span>
                                        ) : (
                                            <OrderRowActions
                                                order={order}
                                                updatingId={updatingId}
                                                onChange={handleStatusChange}
                                            />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modale détail commande */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
                    <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-black dark:text-white">{selectedOrder.orderNumber}</h2>
                                <span className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedOrder.status]}`}>
                                    {ORDER_STATUS_LABELS_FR[selectedOrder.status]}
                                </span>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-xl">✕</button>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
                                    <p className="text-xs text-gray-400 mb-1">Client</p>
                                    <p className="font-semibold text-black dark:text-white">{selectedOrder.customerName}</p>
                                    <p className="text-gray-500">{selectedOrder.customerPhone}</p>
                                    {selectedOrder.customerEmail && <p className="text-gray-500 text-xs">{selectedOrder.customerEmail}</p>}
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
                                    <p className="text-xs text-gray-400 mb-1">Commande</p>
                                    <p className="font-semibold text-black dark:text-white">{selectedOrder.modelName}</p>
                                    <p className="text-gray-500">{selectedOrder.fabricName}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
                                    <p className="text-xs text-gray-400 mb-1">Paiement</p>
                                    <p className="font-semibold text-black dark:text-white">{selectedOrder.totalAmount.toLocaleString('fr-FR')} FCFA</p>
                                    <p className="text-green-600 text-xs">Payé : {selectedOrder.paidAmount.toLocaleString('fr-FR')} FCFA</p>
                                    {selectedOrder.totalAmount > selectedOrder.paidAmount && (
                                        <p className="text-gray-500 text-xs">Reste : {(selectedOrder.totalAmount - selectedOrder.paidAmount).toLocaleString('fr-FR')} FCFA</p>
                                    )}
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
                                    <p className="text-xs text-gray-400 mb-1">Date</p>
                                    <p className="font-semibold text-black dark:text-white">{new Date(selectedOrder.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    {selectedOrder.appointmentDate && (
                                        <p className="text-gray-500 text-xs">RDV : {new Date(selectedOrder.appointmentDate).toLocaleDateString('fr-FR')}</p>
                                    )}
                                    {selectedOrder.location && <p className="text-gray-500 text-xs capitalize">{selectedOrder.location}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Bloc Mesures — éditable selon rôle/statut */}
                        <MeasurementsBlock
                            measurements={selectedOrder.measurements}
                            onEdit={canEditMeasurements ? () => setEditingMeasurements(true) : undefined}
                        />

                        {/* Actions dans la modale (cachées en lecture seule) */}
                        {!isReadOnly && !isTerminal(selectedOrder.status) && (
                            <div className="space-y-3 mt-6">
                                {role === 'admin' && (
                                    <div className="rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50/70 dark:bg-teal-950/20 p-4 space-y-3">
                                        <div>
                                            <p className="text-sm font-semibold text-black dark:text-white">Livraison maison</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                Une livraison est créée automatiquement quand la commande passe en “Prêt pour livraison”.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selectedOrder.status]}`}>
                                                {ORDER_STATUS_LABELS_FR[selectedOrder.status]}
                                            </span>
                                            <button
                                                onClick={() => handleLaunchDelivery(selectedOrder)}
                                                disabled={selectedOrder.status !== 'ready_for_delivery' || launchingDeliveryId === selectedOrder.orderNumber}
                                                className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
                                            >
                                                {launchingDeliveryId === selectedOrder.orderNumber
                                                    ? 'Création…'
                                                    : selectedOrder.status === 'ready_for_delivery'
                                                        ? 'Lancer la livraison'
                                                        : 'Passez à prêt pour livraison'}
                                            </button>
                                        </div>
                                        {selectedOrder.status !== 'ready_for_delivery' && (
                                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                                Cette action sera activée quand la commande atteindra le statut “Prêt pour livraison”.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {role === 'admin' && (
                                    <details className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-4">
                                        <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-black dark:text-white">Outils admin</p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">Suggestion, rappel et assignation dans un seul panneau.</p>
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Afficher</span>
                                        </summary>
                                        <div className="mt-4 space-y-4">
                                            {selectedOrder && selectedOrder.model_id && selectedOrder.professional_id && (
                                                <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/20 p-4 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-semibold text-black dark:text-white">Couturier suggéré</p>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400">Suggestion déduite du modèle associé à la commande.</p>
                                                        </div>
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                                                            Suggestion auto-détectée
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <span className="text-sm font-medium text-black dark:text-white">
                                                            {professionalNames[selectedOrder.professional_id] || 'Couturier'}
                                                        </span>
                                                        <button
                                                            onClick={async () => {
                                                                setLaunchingDeliveryId(null)
                                                                setRemindingCouturierId(null)
                                                                try {
                                                                    setLaunchingDeliveryId(selectedOrder.orderNumber)
                                                                    const res = await acceptCouturierSuggestionAction({orderId: selectedOrder.id, professionalId: selectedOrder.professional_id!})
                                                                    if (!res.success) {
                                                                        notify.error(res.error ?? 'Impossible d\'accepter la suggestion')
                                                                        return
                                                                    }
                                                                    notify.success('Suggestion acceptée', 'Le couturier a été affecté à la commande')
                                                                    await load()
                                                                } catch (err) {
                                                                    notify.error(err)
                                                                } finally {
                                                                    setLaunchingDeliveryId(null)
                                                                }
                                                            }}
                                                            className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200"
                                                        >
                                                            Accepter
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                setLaunchingDeliveryId(null)
                                                                setRemindingCouturierId(null)
                                                                try {
                                                                    setLaunchingDeliveryId(selectedOrder.orderNumber)
                                                                    const res = await revokeCouturierSuggestionAction({orderId: selectedOrder.id})
                                                                    if (!res.success) {
                                                                        notify.error(res.error ?? 'Impossible de retirer la suggestion')
                                                                        return
                                                                    }
                                                                    notify.success('Suggestion retirée', 'Le couturier a été désassigné')
                                                                    await load()
                                                                } catch (err) {
                                                                    notify.error(err)
                                                                } finally {
                                                                    setLaunchingDeliveryId(null)
                                                                }
                                                            }}
                                                            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600"
                                                        >
                                                            Retirer
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {selectedOrder.professional_id && (
                                                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-black/20 p-4 space-y-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-black dark:text-white">Rappel couturier</p>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">Relance WhatsApp du couturier rattaché à cette commande.</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemindCouturier(selectedOrder)}
                                                        disabled={remindingCouturierId === selectedOrder.orderNumber}
                                                        className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
                                                    >
                                                        {remindingCouturierId === selectedOrder.orderNumber ? 'Envoi…' : 'Relancer'}
                                                    </button>
                                                </div>
                                            )}

                                            {!selectedOrder.professional_id && (
                                                <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/20 p-4 space-y-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-black dark:text-white">Assignation manuelle</p>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">Rechercher et assigner un couturier à la commande.</p>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Rechercher un couturier par nom..."
                                                        value={searchCouturier}
                                                        onChange={(e) => setSearchCouturier(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white text-sm"
                                                    />
                                                    <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 p-2">
                                                        {couturiers
                                                            .filter(c => c.name.toLowerCase().includes(searchCouturier.toLowerCase()) || c.email.toLowerCase().includes(searchCouturier.toLowerCase()))
                                                            .map(c => (
                                                                <button
                                                                    key={c.id}
                                                                    onClick={async () => {
                                                                        setAssigningCouturierId(c.id)
                                                                        try {
                                                                            const res = await manualAssignCouturierAction({orderId: selectedOrder.id, orderNumber: selectedOrder.orderNumber, couturierId: c.id})
                                                                            if (!res.success) {
                                                                                console.error('manualAssign failed', {orderId: selectedOrder.id, couturierId: c.id, error: res.error})
                                                                                notify.error(res.error ?? 'Impossible d\'assigner le couturier')
                                                                                return
                                                                            }
                                                                            notify.success('Couturier assigné', `${c.name} a été affecté à la commande`)
                                                                            setProfessionalNames(prev => ({...prev, [c.id]: c.name}))
                                                                            setSearchCouturier('')
                                                                            await load()
                                                                        } catch (err) {
                                                                            console.error('manualAssign unexpected error', err)
                                                                            const message = err instanceof Error ? err.message : String(err)
                                                                            notify.error(message)
                                                                        } finally {
                                                                            setAssigningCouturierId(null)
                                                                        }
                                                                    }}
                                                                    disabled={assigningCouturierId !== null || selectedOrder.professional_id === c.id}
                                                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-gray-800 dark:text-gray-200"
                                                                >
                                                                    <div className="font-medium">{c.name}</div>
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{c.email}</div>
                                                                </button>
                                                            ))}
                                                        {couturiers.filter(c => c.name.toLowerCase().includes(searchCouturier.toLowerCase()) || c.email.toLowerCase().includes(searchCouturier.toLowerCase())).length === 0 && (
                                                            <p className="text-xs text-gray-500 p-2 text-center">Aucun couturier trouvé</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </details>
                                )}

                                <div className="flex gap-3">
                                {NEXT_STATUS[selectedOrder.status] && (
                                    <button
                                        onClick={() => handleStatusChange(selectedOrder, NEXT_STATUS[selectedOrder.status]!)}
                                        disabled={updatingId === selectedOrder.orderNumber}
                                        className="flex-1 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold text-sm hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
                                    >
                                        {updatingId === selectedOrder.orderNumber ? '...' : NEXT_STATUS_LABEL[selectedOrder.status]}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleStatusChange(selectedOrder, 'cancelled')}
                                    disabled={updatingId === selectedOrder.orderNumber}
                                    className="px-4 py-2.5 border border-red-300 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
                                >
                                    Annuler
                                </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {editingMeasurements && selectedOrder && (
                <MeasurementsEditModal
                    initial={selectedOrder.measurements}
                    onClose={() => setEditingMeasurements(false)}
                    onSave={handleSaveMeasurements}
                    submitting={savingMeasurements}
                />
            )}
        </div>
    )
}
