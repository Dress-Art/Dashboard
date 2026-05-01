'use client'

import {useCallback, useEffect, useMemo, useState} from 'react'
import {PlusIcon, ArrowDownTrayIcon} from '@heroicons/react/24/outline'
import {useAuthContext} from '@/contexts/AuthContext'
import {notify} from '@/lib/toast'
import {createTissu, deleteTissu, listTissus, updateTissu} from '@/lib/tissus-api'
import type {Tissu, TissuStockFilter} from '@/types/tissu.types'
import {TissusTable} from './TissusTable'

type FormData = {
    nom: string
    prix_metre: string  // string pour input controlled, parsed à la submit
    texture: string
    couleur: string
    image_url: string
    stock_disponible: boolean
}

const EMPTY_FORM: FormData = {
    nom: '',
    prix_metre: '',
    texture: '',
    couleur: '',
    image_url: '',
    stock_disponible: true,
}

const TABS: ReadonlyArray<{id: TissuStockFilter; label: string}> = [
    {id: 'all', label: 'Tous'},
    {id: 'available', label: 'En stock'},
    {id: 'unavailable', label: 'Rupture'},
]

export function TissusPage() {
    const {user, role} = useAuthContext()
    const [q, setQ] = useState('')
    const [stockFilter, setStockFilter] = useState<TissuStockFilter>('all')
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<{items: Tissu[]; total: number} | null>(null)

    const [mode, setMode] = useState<'idle' | 'create' | 'edit' | 'view' | 'delete'>('idle')
    const [activeTissu, setActiveTissu] = useState<Tissu | null>(null)
    const [form, setForm] = useState<FormData>(EMPTY_FORM)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const isAdmin = role === 'admin'
    const isVendor = role === 'vendeur'
    const canCreate = isAdmin || isVendor
    const canDelete = isAdmin
    // Edition : admin tout, vendeur seulement ses tissus (RLS le force aussi serveur)
    const canEditTissu = useCallback(
        (t: Tissu) => isAdmin || (isVendor && t.vendor_id === user?.id),
        [isAdmin, isVendor, user?.id],
    )

    const closeModal = () => {
        setMode('idle')
        setActiveTissu(null)
        setForm(EMPTY_FORM)
    }

    const load = useCallback(async () => {
        try {
            setLoading(true)
            const stock = stockFilter === 'all' ? null : stockFilter
            const result = await listTissus({search: q.trim(), stock})
            setData({items: result.tissus, total: result.total})
        } catch (err) {
            console.error('Erreur chargement tissus:', err)
            notify.error(err)
            setData({items: [], total: 0})
        } finally {
            setLoading(false)
        }
    }, [q, stockFilter])

    useEffect(() => {
        load()
    }, [load])

    const counts = useMemo(() => {
        // counts approximatifs côté client à partir de la page courante
        // (filtre serveur déjà appliqué sur stockFilter — ces counts servent les onglets en mode 'all')
        const items = data?.items ?? []
        return {
            all: data?.total ?? items.length,
            available: items.filter(t => t.stock_disponible).length,
            unavailable: items.filter(t => !t.stock_disponible).length,
        }
    }, [data])

    const openCreate = () => {
        setForm(EMPTY_FORM)
        setActiveTissu(null)
        setMode('create')
    }

    const openEdit = (t: Tissu) => {
        if (!canEditTissu(t)) {
            notify.error('Vous ne pouvez modifier que vos propres tissus')
            return
        }
        setActiveTissu(t)
        setForm({
            nom: t.nom,
            prix_metre: String(t.prix_metre),
            texture: t.texture ?? '',
            couleur: t.couleur ?? '',
            image_url: t.image_url ?? '',
            stock_disponible: t.stock_disponible,
        })
        setMode('edit')
    }

    const openView = (t: Tissu) => {
        setActiveTissu(t)
        setMode('view')
    }

    const openDelete = (t: Tissu) => {
        if (!canDelete) return
        setActiveTissu(t)
        setMode('delete')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const prix = parseFloat(form.prix_metre)
        if (!form.nom.trim() || !Number.isFinite(prix) || prix <= 0) {
            notify.error('Nom et prix/mètre (>0) sont requis')
            return
        }

        try {
            setActionLoading(mode)
            if (mode === 'create') {
                // RLS INSERT exige vendor_id = auth.uid() pour le rôle vendeur
                const ownership = isVendor && user ? {vendor_id: user.id} : {}
                await createTissu({
                    nom: form.nom.trim(),
                    prix_metre: prix,
                    texture: form.texture.trim() || null,
                    couleur: form.couleur.trim() || null,
                    image_url: form.image_url.trim() || null,
                    stock_disponible: form.stock_disponible,
                    ...ownership,
                })
                notify.success('Tissu créé', form.nom)
            } else if (mode === 'edit' && activeTissu) {
                await updateTissu(activeTissu.id, {
                    nom: form.nom.trim(),
                    prix_metre: prix,
                    texture: form.texture.trim() || null,
                    couleur: form.couleur.trim() || null,
                    image_url: form.image_url.trim() || null,
                    stock_disponible: form.stock_disponible,
                })
                notify.success('Tissu mis à jour', form.nom)
            }
            closeModal()
            await load()
        } catch (err) {
            notify.error(err)
        } finally {
            setActionLoading(null)
        }
    }

    const handleConfirmDelete = async () => {
        if (!activeTissu) return
        const nom = activeTissu.nom
        try {
            setActionLoading(`delete-${activeTissu.id}`)
            await deleteTissu(activeTissu.id)
            notify.success('Tissu supprimé', nom)
            closeModal()
            await load()
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
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-black dark:text-white">Tissus</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {role === 'couturier'
                            ? 'Catalogue des vendeurs'
                            : role === 'vendeur'
                                ? 'Mes tissus en vente'
                                : 'Catalogue tissus DressArt'}
                    </p>
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
                    {canCreate && (
                        <button
                            onClick={openCreate}
                            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Nouveau tissu
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-black rounded-lg shadow-md border border-gray-300 dark:border-gray-700">
                {/* Onglets stock */}
                <div className="border-b border-gray-300 dark:border-gray-700 px-6">
                    <nav className="flex gap-6">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setStockFilter(tab.id)}
                                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                                    stockFilter === tab.id
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
                    <form
                        onSubmit={e => {
                            e.preventDefault()
                            load()
                        }}
                        className="flex gap-4"
                    >
                        <input
                            type="text"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Rechercher un tissu (nom)..."
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

                    <TissusTable
                        tissus={data?.items ?? []}
                        loading={loading}
                        canEdit={canCreate}
                        canDelete={canDelete}
                        onView={openView}
                        onEdit={openEdit}
                        onDelete={openDelete}
                        actionLoading={actionLoading}
                    />
                </div>
            </div>

            {(mode === 'create' || mode === 'edit') && (
                <TissuFormModal
                    mode={mode}
                    form={form}
                    onChange={setForm}
                    onSubmit={handleSubmit}
                    onClose={closeModal}
                    submitting={actionLoading === 'create' || actionLoading === 'edit'}
                />
            )}

            {mode === 'view' && activeTissu && (
                <TissuViewModal
                    tissu={activeTissu}
                    onClose={closeModal}
                    onEdit={canEditTissu(activeTissu) ? () => openEdit(activeTissu) : undefined}
                />
            )}

            {mode === 'delete' && activeTissu && (
                <TissuDeleteModal
                    tissu={activeTissu}
                    submitting={actionLoading === `delete-${activeTissu.id}`}
                    onClose={closeModal}
                    onConfirm={handleConfirmDelete}
                />
            )}
        </div>
    )
}

// =============================================================================
// Modales
// =============================================================================

interface TissuFormModalProps {
    mode: 'create' | 'edit'
    form: FormData
    onChange: (f: FormData) => void
    onSubmit: (e: React.FormEvent) => void
    onClose: () => void
    submitting: boolean
}

function TissuFormModal({mode, form, onChange, onSubmit, onClose, submitting}: TissuFormModalProps) {
    const set = <K extends keyof FormData>(k: K, v: FormData[K]) => onChange({...form, [k]: v})
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-black rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">
                    {mode === 'create' ? 'Ajouter un tissu' : 'Modifier le tissu'}
                </h3>
                <form onSubmit={onSubmit} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Nom *"
                        value={form.nom}
                        onChange={e => set('nom', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white"
                        required
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="text"
                            placeholder="Texture"
                            value={form.texture}
                            onChange={e => set('texture', e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white"
                        />
                        <input
                            type="text"
                            placeholder="Couleur"
                            value={form.couleur}
                            onChange={e => set('couleur', e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white"
                        />
                    </div>
                    <input
                        type="number"
                        step="100"
                        min="0"
                        placeholder="Prix au mètre (FCFA) *"
                        value={form.prix_metre}
                        onChange={e => set('prix_metre', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white"
                        required
                    />
                    <input
                        type="url"
                        placeholder="URL image (optionnel)"
                        value={form.image_url}
                        onChange={e => set('image_url', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-black dark:text-white"
                    />
                    <label className="flex items-center gap-2 text-sm text-black dark:text-white">
                        <input
                            type="checkbox"
                            checked={form.stock_disponible}
                            onChange={e => set('stock_disponible', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-700"
                        />
                        En stock
                    </label>
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
                            {submitting ? 'Envoi...' : mode === 'create' ? 'Créer' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

interface TissuViewModalProps {
    tissu: Tissu
    onClose: () => void
    onEdit?: () => void
}

function TissuViewModal({tissu, onClose, onEdit}: TissuViewModalProps) {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-950 rounded-2xl p-6 w-full max-w-lg border border-gray-200 dark:border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-6 gap-4">
                    {tissu.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={tissu.image_url}
                            alt={tissu.nom}
                            className="w-24 h-24 rounded-xl object-cover border border-gray-200 dark:border-gray-700"
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                    )}
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-black dark:text-white">{tissu.nom}</h2>
                        <span
                            className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                tissu.stock_disponible
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            {tissu.stock_disponible ? 'En stock' : 'Rupture'}
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

                <div className="grid grid-cols-2 gap-3 text-sm">
                    <Field label="Texture" value={tissu.texture || '—'} />
                    <Field label="Couleur" value={tissu.couleur || '—'} />
                    <Field
                        label="Prix au mètre"
                        value={`${tissu.prix_metre.toLocaleString('fr-FR')} FCFA`}
                    />
                    <Field
                        label="Mise à jour"
                        value={new Date(tissu.updated_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                        })}
                    />
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-black dark:text-white rounded-xl font-semibold text-sm hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                    >
                        Fermer
                    </button>
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="flex-1 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold text-sm hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                        >
                            Modifier
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function Field({label, value}: {label: string; value: string}) {
    return (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="font-medium text-black dark:text-white break-words">{value}</p>
        </div>
    )
}

interface TissuDeleteModalProps {
    tissu: Tissu
    submitting: boolean
    onClose: () => void
    onConfirm: () => void
}

function TissuDeleteModal({tissu, submitting, onClose, onConfirm}: TissuDeleteModalProps) {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-black rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-800 shadow-xl"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold mb-2 text-black dark:text-white">Supprimer ce tissu ?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Cette action est irréversible. Le tissu{' '}
                    <strong className="text-black dark:text-white">{tissu.nom}</strong> sera définitivement supprimé.
                    Les commandes existantes conservent leur snapshot (`fabric_id` mis à NULL).
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
