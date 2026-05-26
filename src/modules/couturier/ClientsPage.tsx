'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClientsTable } from './ClientsTable'
import { PlusIcon, ArrowDownTrayIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import { listClients, createClient, updateClient, deleteClient, listMeasurements, deleteMeasurement, saveClientMeasurements, STANDARD_MEASUREMENTS } from '@/lib/couturier-api'
import { notify } from '@/lib/toast'

type ClientStatus = 'active' | 'inactive' | 'suspended'

interface ClientEntity {
    id: string
    name: string
    email: string
    phone: string
    address: string
    city: string
    postal_code: string
    status: ClientStatus
    total_orders: number
    total_spent: number
    created_at: string
    last_order_at?: string
    notes?: string
}

type ClientFormData = {
    name: string
    email: string
    phone: string
    address: string
    city: string
    postal_code: string
    notes: string
    status: ClientStatus
}

const EMPTY_FORM: ClientFormData = {
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    notes: '',
    status: 'active',
}

export function ClientsPage() {
    const [q, setQ] = useState('')
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<{items: ClientEntity[]; total: number} | null>(null)

    // Modales : 1 seule active à la fois
    const [mode, setMode] = useState<'idle' | 'create' | 'edit' | 'view' | 'delete'>('idle')
    const [activeClient, setActiveClient] = useState<ClientEntity | null>(null)
    const [form, setForm] = useState<ClientFormData>(EMPTY_FORM)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const closeModal = () => {
        setMode('idle')
        setActiveClient(null)
        setForm(EMPTY_FORM)
    }

    const loadClients = useCallback(async () => {
        try {
            setLoading(true)
            const result = await listClients({search: q.trim()})
            const items = result.clients.map(c => ({
                id: c.id,
                name: c.name,
                email: c.email ?? '',
                phone: c.phone ?? '',
                address: c.address ?? '',
                city: c.city ?? '',
                postal_code: c.postal_code ?? '',
                status: c.status,
                total_orders: c.total_orders ?? 0,
                total_spent: c.total_spent ?? 0,
                created_at: c.created_at,
                last_order_at: c.last_order_at ?? undefined,
                notes: c.notes ?? undefined,
            }))
            setData({items, total: result.total})
        } catch (err) {
            console.error('Erreur chargement clients:', err)
            notify.error(err)
            setData({items: [], total: 0})
        } finally {
            setLoading(false)
        }
    }, [q])

    useEffect(() => {
        loadClients()
    }, [loadClients])

    const openCreate = () => {
        setForm(EMPTY_FORM)
        setActiveClient(null)
        setMode('create')
    }

    const openEdit = (client: ClientEntity) => {
        setActiveClient(client)
        setForm({
            name: client.name || '',
            email: client.email || '',
            phone: client.phone || '',
            address: client.address || '',
            city: client.city || '',
            postal_code: client.postal_code || '',
            notes: client.notes || '',
            status: client.status,
        })
        setMode('edit')
    }

    const openView = (client: ClientEntity) => {
        setActiveClient(client)
        setMode('view')
    }

    const openDelete = (clientId: string) => {
        const client = data?.items.find(c => c.id === clientId) ?? null
        setActiveClient(client)
        setMode('delete')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name || !form.email || !form.phone) {
            notify.error('Les champs nom, email et téléphone sont requis')
            return
        }

        try {
            setActionLoading(mode)
            if (mode === 'create') {
                // L'helper createClient injecte professional_id = auth.uid() pour
                // que la RLS INSERT couturier passe. Cas agent à gérer côté
                // server action si on l'autorise plus tard.
                await createClient({
                    name: form.name,
                    email: form.email,
                    phone: form.phone,
                    address: form.address || null,
                    city: form.city || null,
                    postal_code: form.postal_code || null,
                    notes: form.notes || null,
                })
                notify.success('Client créé', form.name)
            } else if (mode === 'edit' && activeClient) {
                await updateClient(activeClient.id, {
                    name: form.name,
                    email: form.email,
                    phone: form.phone,
                    address: form.address,
                    city: form.city,
                    postal_code: form.postal_code,
                    status: form.status,
                })
                notify.success('Client mis à jour', form.name)
            }
            closeModal()
            await loadClients()
        } catch (err) {
            notify.error(err)
        } finally {
            setActionLoading(null)
        }
    }

    const handleConfirmDelete = async () => {
        if (!activeClient) return
        const name = activeClient.name
        try {
            setActionLoading(`delete-${activeClient.id}`)
            await deleteClient(activeClient.id)
            notify.success('Client supprimé', name)
            closeModal()
            await loadClients()
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
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-black dark:text-white">Liste des Clients</h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => {/* Exporter */}}
                        disabled
                        className="px-4 py-2 text-black dark:text-white bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-40 transition-colors font-medium flex items-center gap-2"
                        title="Bientôt"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Exporter
                    </button>
                    <button
                        onClick={openCreate}
                        className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Nouveau client
                    </button>
                </div>
            </div>

            {/* Contenu */}
            <div className="bg-white dark:bg-black rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <div className="space-y-4">
                    {/* Recherche */}
                    <form onSubmit={e => {e.preventDefault(); loadClients()}} className="flex gap-4">
                        <input
                            type="text"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Rechercher un client..."
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white placeholder-gray-500"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 font-medium"
                        >
                            {loading ? 'Recherche...' : 'Rechercher'}
                        </button>
                    </form>

                    {/* Tableau */}
                    <ClientsTable
                        clients={data?.items || []}
                        loading={loading}
                        actionLoading={actionLoading}
                        onView={openView}
                        onEdit={openEdit}
                        onDelete={openDelete}
                    />
                </div>
            </div>

            {/* Modale Création / Édition (formulaire partagé) */}
            {(mode === 'create' || mode === 'edit') && (
                <ClientFormModal
                    mode={mode}
                    form={form}
                    onChange={setForm}
                    onSubmit={handleSubmit}
                    onClose={closeModal}
                    submitting={actionLoading === 'create' || actionLoading === 'edit'}
                />
            )}

            {/* Modale Détails (lecture seule) */}
            {mode === 'view' && activeClient && (
                <ClientViewModal client={activeClient} onClose={closeModal} onEdit={() => openEdit(activeClient)} />
            )}

            {/* Modale Suppression (confirmation) */}
            {mode === 'delete' && activeClient && (
                <ClientDeleteModal
                    client={activeClient}
                    submitting={actionLoading === `delete-${activeClient.id}`}
                    onClose={closeModal}
                    onConfirm={handleConfirmDelete}
                />
            )}
        </div>
    )
}

// =============================================================================
// Sous-composants : modales
// =============================================================================

interface ClientFormModalProps {
    mode: 'create' | 'edit'
    form: ClientFormData
    onChange: (f: ClientFormData) => void
    onSubmit: (e: React.FormEvent) => void
    onClose: () => void
    submitting: boolean
}

function ClientFormModal({mode, form, onChange, onSubmit, onClose, submitting}: ClientFormModalProps) {
    const set = <K extends keyof ClientFormData>(k: K, v: ClientFormData[K]) =>
        onChange({...form, [k]: v})
    const title = mode === 'create' ? 'Ajouter un client' : 'Modifier le client'
    const cta = mode === 'create' ? 'Créer' : 'Enregistrer'
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-black rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">{title}</h3>
                <form onSubmit={onSubmit} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Nom complet *"
                        value={form.name}
                        onChange={e => set('name', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white"
                        required
                    />
                    <input
                        type="email"
                        placeholder="Email *"
                        value={form.email}
                        onChange={e => set('email', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white"
                        required
                    />
                    <input
                        type="tel"
                        placeholder="Téléphone *"
                        value={form.phone}
                        onChange={e => set('phone', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white"
                        required
                    />
                    <input
                        type="text"
                        placeholder="Adresse"
                        value={form.address}
                        onChange={e => set('address', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="text"
                            placeholder="Ville"
                            value={form.city}
                            onChange={e => set('city', e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white"
                        />
                        <input
                            type="text"
                            placeholder="Code postal"
                            value={form.postal_code}
                            onChange={e => set('postal_code', e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white"
                        />
                    </div>
                    <textarea
                        placeholder="Notes (optionnel)"
                        value={form.notes}
                        onChange={e => set('notes', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white resize-none"
                    />
                    {mode === 'edit' && (
                        <select
                            value={form.status}
                            onChange={e => set('status', e.target.value as ClientStatus)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white"
                        >
                            <option value="active">Actif</option>
                            <option value="inactive">Inactif</option>
                            <option value="suspended">Suspendu</option>
                        </select>
                    )}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-white dark:bg-black text-black dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 font-medium"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 font-medium"
                        >
                            {submitting ? 'Envoi...' : cta}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

interface ClientViewModalProps {
    client: ClientEntity
    onClose: () => void
    onEdit: () => void
}

function ClientViewModal({client, onClose, onEdit}: ClientViewModalProps) {
    const formatFCFA = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`
    const formatDate = (d?: string) =>
        d ? new Date(d).toLocaleDateString('fr-FR', {day: 'numeric', month: 'long', year: 'numeric'}) : '—'

    type MeasurementItem = {id: string; name: string; value: number; unit: string}
    type DraftItem = {name: string; value: string; unit: 'cm' | 'in'}

    const [storedMeasurements, setStoredMeasurements] = useState<MeasurementItem[]>([])
    const [measurementsLoading, setMeasurementsLoading] = useState(true)
    const [standardDraft, setStandardDraft] = useState<DraftItem[]>(
        STANDARD_MEASUREMENTS.map(name => ({name, value: '', unit: 'cm'})),
    )
    const [customDraft, setCustomDraft] = useState<Array<{id?: string; name: string; value: string; unit: 'cm' | 'in'}>>([])
    const [savingMeasurements, setSavingMeasurements] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const loadMeasurements = async () => {
        setMeasurementsLoading(true)
        try {
            const result = await listMeasurements({clientId: client.id, limit: 1000})
            const items = result.measurements.map(m => ({
                id: m.id,
                name: m.name,
                value: m.value,
                unit: m.unit,
            }))
            setStoredMeasurements(items)
            const byName = new Map(items.map(i => [i.name, i]))
            setStandardDraft(STANDARD_MEASUREMENTS.map(name => {
                const existing = byName.get(name)
                return {
                    name,
                    value: existing ? String(existing.value) : '',
                    unit: (existing?.unit as 'cm' | 'in') ?? 'cm',
                }
            }))
            // Mesures hors template = mesures personnalisées ajoutées par le couturier.
            const standardSet = new Set<string>(STANDARD_MEASUREMENTS)
            setCustomDraft(
                items
                    .filter(i => !standardSet.has(i.name))
                    .map(i => ({id: i.id, name: i.name, value: String(i.value), unit: i.unit as 'cm' | 'in'})),
            )
        } catch (err) {
            console.error('Erreur chargement mesures du client:', err)
        } finally {
            setMeasurementsLoading(false)
        }
    }

    useEffect(() => {
        void loadMeasurements()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [client.id])

    const updateStandard = (idx: number, patch: Partial<DraftItem>) => {
        setStandardDraft(prev => prev.map((item, i) => (i === idx ? {...item, ...patch} : item)))
    }

    const updateCustom = (idx: number, patch: Partial<{name: string; value: string; unit: 'cm' | 'in'}>) => {
        setCustomDraft(prev => prev.map((item, i) => (i === idx ? {...item, ...patch} : item)))
    }

    const addCustomLine = () => {
        setCustomDraft(prev => [...prev, {name: '', value: '', unit: 'cm'}])
    }

    const removeCustomLine = (idx: number) => {
        setCustomDraft(prev => prev.filter((_, i) => i !== idx))
    }

    const handleSaveMeasurements = async () => {
        try {
            setSavingMeasurements(true)
            const items = [
                ...standardDraft.map(d => ({
                    name: d.name,
                    value: d.value === '' ? 0 : Number(d.value),
                    unit: d.unit,
                })),
                ...customDraft
                    .filter(d => d.name.trim() !== '')
                    .map(d => ({
                        name: d.name.trim(),
                        value: d.value === '' ? 0 : Number(d.value),
                        unit: d.unit,
                    })),
            ]
            await saveClientMeasurements(client.id, items)
            notify.success('Mesures enregistrées')
            await loadMeasurements()
        } catch (err) {
            notify.error(err)
        } finally {
            setSavingMeasurements(false)
        }
    }

    const handleDeleteMeasurement = async (id: string) => {
        try {
            setDeletingId(id)
            await deleteMeasurement(id)
            await loadMeasurements()
        } catch (err) {
            notify.error(err)
        } finally {
            setDeletingId(null)
        }
    }

    const filledStandardCount = standardDraft.filter(d => d.value !== '' && Number(d.value) > 0).length

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-950 rounded-2xl p-6 w-full max-w-2xl border border-gray-200 dark:border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-black dark:text-white">{client.name}</h2>
                        <span className="mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">
                            {client.status}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-xl"
                        aria-label="Fermer"
                    >
                        ✕
                    </button>
                </div>

                <section className="mb-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Fiche d&apos;identité</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <Field label="Email" value={client.email} />
                        <Field label="Téléphone" value={client.phone} />
                        <Field label="Adresse" value={client.address || '—'} className="col-span-2" />
                        <Field label="Ville" value={client.city || '—'} />
                        <Field label="Code postal" value={client.postal_code || '—'} />
                        <Field label="Commandes" value={String(client.total_orders ?? 0)} />
                        <Field label="Total dépensé" value={formatFCFA(client.total_spent ?? 0)} />
                        <Field label="Inscription" value={formatDate(client.created_at)} />
                        <Field label="Dernière commande" value={formatDate(client.last_order_at)} />
                        {client.notes && <Field label="Notes" value={client.notes} className="col-span-2" />}
                    </div>
                </section>

                <section className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Mesures du client
                        </h3>
                        {!measurementsLoading && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {filledStandardCount}/{STANDARD_MEASUREMENTS.length} remplies
                                {storedMeasurements.length > STANDARD_MEASUREMENTS.length &&
                                    ` · ${storedMeasurements.length - filledStandardCount} personnalisées`}
                            </span>
                        )}
                    </div>

                    {measurementsLoading ? (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-xs text-gray-500 dark:text-gray-400">
                            Chargement…
                        </div>
                    ) : (
                        <>
                            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                                {standardDraft.map((item, idx) => (
                                    <div
                                        key={item.name}
                                        className="px-3 py-2 flex items-center gap-3 text-sm border-b border-gray-100 dark:border-gray-900 last:border-b-0"
                                    >
                                        <label className="flex-1 text-gray-700 dark:text-gray-300" htmlFor={`std-${idx}`}>
                                            {item.name}
                                        </label>
                                        <input
                                            id={`std-${idx}`}
                                            type="number"
                                            min={0}
                                            step="0.1"
                                            inputMode="decimal"
                                            placeholder="—"
                                            value={item.value}
                                            onChange={e => updateStandard(idx, {value: e.target.value})}
                                            className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-right text-sm text-black dark:text-white tabular-nums"
                                        />
                                        <select
                                            value={item.unit}
                                            onChange={e => updateStandard(idx, {unit: e.target.value as 'cm' | 'in'})}
                                            className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-sm text-black dark:text-white"
                                            aria-label={`Unité ${item.name}`}
                                        >
                                            <option value="cm">cm</option>
                                            <option value="in">in</option>
                                        </select>
                                    </div>
                                ))}
                            </div>

                            {customDraft.length > 0 && (
                                <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                                    <p className="px-3 py-2 text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-900 bg-gray-50 dark:bg-neutral-900/40">
                                        Mesures personnalisées
                                    </p>
                                    {customDraft.map((item, idx) => (
                                        <div
                                            key={item.id ?? `custom-${idx}`}
                                            className="px-3 py-2 flex items-center gap-2 text-sm border-b border-gray-100 dark:border-gray-900 last:border-b-0"
                                        >
                                            <input
                                                type="text"
                                                placeholder="Nom de la mesure"
                                                value={item.name}
                                                onChange={e => updateCustom(idx, {name: e.target.value})}
                                                className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-sm text-black dark:text-white"
                                            />
                                            <input
                                                type="number"
                                                min={0}
                                                step="0.1"
                                                placeholder="—"
                                                value={item.value}
                                                onChange={e => updateCustom(idx, {value: e.target.value})}
                                                className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-right text-sm text-black dark:text-white tabular-nums"
                                            />
                                            <select
                                                value={item.unit}
                                                onChange={e => updateCustom(idx, {unit: e.target.value as 'cm' | 'in'})}
                                                className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-sm text-black dark:text-white"
                                            >
                                                <option value="cm">cm</option>
                                                <option value="in">in</option>
                                            </select>
                                            {item.id ? (
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDeleteMeasurement(item.id!)}
                                                    disabled={deletingId === item.id}
                                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50 transition-colors"
                                                    title="Supprimer cette mesure"
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => removeCustomLine(idx)}
                                                    className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded transition-colors"
                                                    title="Retirer cette ligne"
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={addCustomLine}
                                    className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors"
                                >
                                    <PlusIcon className="w-3.5 h-3.5" />
                                    Ajouter une mesure personnalisée
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleSaveMeasurements()}
                                    disabled={savingMeasurements}
                                    className="inline-flex items-center gap-1 px-3 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
                                >
                                    <PencilSquareIcon className="w-3.5 h-3.5" />
                                    {savingMeasurements ? 'Enregistrement…' : 'Enregistrer les mesures'}
                                </button>
                            </div>
                        </>
                    )}
                </section>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-black dark:text-white rounded-xl font-semibold text-sm hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                    >
                        Fermer
                    </button>
                    <button
                        onClick={onEdit}
                        className="flex-1 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                    >
                        Modifier la fiche
                    </button>
                </div>
            </div>
        </div>
    )
}

function Field({label, value, className}: {label: string; value: string; className?: string}) {
    return (
        <div className={`bg-gray-50 dark:bg-gray-900 rounded-xl p-3 ${className ?? ''}`}>
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="font-medium text-black dark:text-white break-words">{value}</p>
        </div>
    )
}

interface ClientDeleteModalProps {
    client: ClientEntity
    submitting: boolean
    onClose: () => void
    onConfirm: () => void
}

function ClientDeleteModal({client, submitting, onClose, onConfirm}: ClientDeleteModalProps) {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-black rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-xl"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold mb-2 text-black dark:text-white">Supprimer ce client ?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Cette action est irréversible. Le client <strong className="text-black dark:text-white">{client.name}</strong> sera définitivement supprimé.
                    Les commandes liées conserveront leur snapshot (`customer_name`, `customer_phone`).
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-white dark:bg-black text-black dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 font-medium"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={submitting}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                    >
                        {submitting ? 'Suppression...' : 'Supprimer'}
                    </button>
                </div>
            </div>
        </div>
    )
}
