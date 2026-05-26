'use client'

import {useCallback, useEffect, useMemo, useState} from 'react'
import {
    PlusIcon,
    MagnifyingGlassIcon,
    UserCircleIcon,
    PencilSquareIcon,
    UsersIcon,
} from '@heroicons/react/24/outline'
import {listMeasurements, createMeasurement, listClients} from '@/lib/couturier-api'
import {notify} from '@/lib/toast'

interface MeasurementRow {
    id: string
    client_id: string | null
    name: string
    value: number
    unit: string
    created_at: string
}

interface ClientLite {
    id: string
    name: string
    phone: string | null
}

interface ClientWithMeasurements extends ClientLite {
    measurements: MeasurementRow[]
}

interface NewMeasurementForm {
    client_id: string
    name: string
    value: number | ''
    unit: 'cm' | 'in'
}

const EMPTY_FORM: NewMeasurementForm = {client_id: '', name: '', value: '', unit: 'cm'}

export function MeasurementsPage() {
    const [q, setQ] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [measurements, setMeasurements] = useState<MeasurementRow[]>([])
    const [clients, setClients] = useState<ClientLite[]>([])

    const [form, setForm] = useState<NewMeasurementForm>(EMPTY_FORM)
    const [showCreate, setShowCreate] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [mRes, cRes] = await Promise.allSettled([
                listMeasurements(),
                listClients({limit: 500}),
            ])
            if (mRes.status === 'fulfilled') {
                setMeasurements(mRes.value.measurements as unknown as MeasurementRow[])
            }
            if (cRes.status === 'fulfilled') {
                setClients(
                    cRes.value.clients.map(c => ({
                        id: c.id,
                        name: c.name ?? 'Client',
                        phone: c.phone ?? null,
                    })),
                )
            }
        } catch (err) {
            console.error('Erreur chargement mesures:', err)
            setError(err instanceof Error ? err.message : 'erreur_inconnue')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    // Regroupement : un client = une carte avec toutes ses mesures inline.
    const grouped = useMemo<ClientWithMeasurements[]>(() => {
        const byClient = new Map<string, MeasurementRow[]>()
        for (const m of measurements) {
            const key = m.client_id ?? '_unknown'
            const list = byClient.get(key) ?? []
            list.push(m)
            byClient.set(key, list)
        }
        const result: ClientWithMeasurements[] = clients.map(c => ({
            ...c,
            measurements: (byClient.get(c.id) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
        }))
        // Mesures orphelines (client supprimé ou non importé)
        const orphans = byClient.get('_unknown')
        if (orphans && orphans.length > 0) {
            result.push({id: '_unknown', name: 'Mesures sans client', phone: null, measurements: orphans})
        }
        return result
    }, [clients, measurements])

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase()
        if (!needle) return grouped
        return grouped.filter(g => {
            if (g.name.toLowerCase().includes(needle)) return true
            if (g.phone?.toLowerCase().includes(needle)) return true
            return g.measurements.some(m => m.name.toLowerCase().includes(needle))
        })
    }, [grouped, q])

    const openCreateFor = (clientId: string | null) => {
        setForm({...EMPTY_FORM, client_id: clientId ?? ''})
        setShowCreate(true)
    }

    const submitCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.client_id || !form.name.trim() || form.value === '' || Number(form.value) <= 0) {
            notify.error('Client, nom de mesure et valeur > 0 requis')
            return
        }
        try {
            setActionLoading('create')
            await createMeasurement({
                client_id: form.client_id,
                name: form.name.trim(),
                value: Number(form.value),
                unit: form.unit,
            })
            notify.success('Mesure enregistrée')
            setShowCreate(false)
            setForm(EMPTY_FORM)
            await load()
        } catch (err) {
            notify.error(err)
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-black dark:text-white">Mesures par client</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Chaque carte regroupe les mesures d&apos;un client. Une seule fiche par client.
                    </p>
                </div>
                <button
                    onClick={() => openCreateFor(null)}
                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors font-medium inline-flex items-center gap-2"
                >
                    <PlusIcon className="w-4 h-4" />
                    Nouvelle mesure
                </button>
            </div>

            {error && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-300">
                    {error}
                </div>
            )}

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-neutral-950">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder="Rechercher un client ou une mesure…"
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-sm text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
                    />
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="h-32 rounded-2xl bg-gray-100 dark:bg-gray-900 animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
                    <UsersIcon className="mx-auto w-10 h-10 text-gray-400 dark:text-gray-600" />
                    <p className="mt-3 text-sm font-medium text-black dark:text-white">
                        {q ? 'Aucun client ne correspond à votre recherche.' : 'Aucun client enregistré pour l\'instant.'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {q ? 'Essayez un autre nom ou mesure.' : 'Ajoutez d\'abord un client depuis l\'onglet Clients.'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {filtered.map(client => (
                        <article
                            key={client.id}
                            className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-neutral-950 overflow-hidden"
                        >
                            <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <UserCircleIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-semibold text-black dark:text-white truncate">{client.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {client.phone ?? 'Pas de téléphone'} ·{' '}
                                            <span className={client.measurements.length === 0 ? 'text-amber-600 dark:text-amber-400' : ''}>
                                                {client.measurements.length} mesure{client.measurements.length > 1 ? 's' : ''}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                {client.id !== '_unknown' && (
                                    <button
                                        onClick={() => openCreateFor(client.id)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-700 px-2.5 py-1 text-xs font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors flex-shrink-0"
                                    >
                                        <PlusIcon className="w-3.5 h-3.5" />
                                        Mesure
                                    </button>
                                )}
                            </header>
                            {client.measurements.length === 0 ? (
                                <div className="px-5 py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                                    <PencilSquareIcon className="mx-auto w-6 h-6 text-gray-400 dark:text-gray-600 mb-2" />
                                    Aucune mesure pour ce client. Cliquez « Mesure » pour en ajouter.
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-100 dark:divide-gray-900">
                                    {client.measurements.map(m => (
                                        <li key={m.id} className="px-5 py-2.5 flex items-center justify-between text-sm">
                                            <span className="text-gray-700 dark:text-gray-300">{m.name}</span>
                                            <span className="font-semibold text-black dark:text-white tabular-nums">
                                                {m.value} {m.unit}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </article>
                    ))}
                </div>
            )}

            {showCreate && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
                    <div className="bg-white dark:bg-black rounded-2xl p-6 w-full max-w-md border border-gray-300 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">Nouvelle mesure</h3>
                        <form onSubmit={submitCreate} className="space-y-3">
                            <select
                                value={form.client_id}
                                onChange={e => setForm(prev => ({...prev, client_id: e.target.value}))}
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-sm text-black dark:text-white"
                                required
                            >
                                <option value="">Sélectionner un client</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="Ex: Tour de poitrine"
                                value={form.name}
                                onChange={e => setForm(prev => ({...prev, name: e.target.value}))}
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-sm text-black dark:text-white"
                                required
                            />
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min={0}
                                    step="0.1"
                                    placeholder="Valeur"
                                    value={form.value}
                                    onChange={e => setForm(prev => ({...prev, value: e.target.value === '' ? '' : Number(e.target.value)}))}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-sm text-black dark:text-white"
                                    required
                                />
                                <select
                                    value={form.unit}
                                    onChange={e => setForm(prev => ({...prev, unit: e.target.value as 'cm' | 'in'}))}
                                    className="w-24 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-sm text-black dark:text-white"
                                >
                                    <option value="cm">cm</option>
                                    <option value="in">in</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-sm font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-900"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading === 'create'}
                                    className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
                                >
                                    {actionLoading === 'create' ? 'Enregistrement…' : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
