'use client'

import {useCallback, useEffect, useMemo, useState} from 'react'
import {ArrowPathIcon, BanknotesIcon, MagnifyingGlassIcon} from '@heroicons/react/24/outline'
import {notify} from '@/lib/toast'
import type {FedaPayStatus, FedaPayTransaction, ListResult} from '@/lib/fedapay'
import {formatCustomer} from '@/lib/fedapay'

type StatusTab = 'all' | 'approved' | 'pending' | 'declined' | 'refunded'

const TABS: ReadonlyArray<{id: StatusTab; label: string; mapsTo?: FedaPayStatus}> = [
    {id: 'all', label: 'Toutes'},
    {id: 'approved', label: 'Approuvées', mapsTo: 'approved'},
    {id: 'pending', label: 'En attente', mapsTo: 'pending'},
    {id: 'declined', label: 'Échouées', mapsTo: 'declined'},
    {id: 'refunded', label: 'Remboursées', mapsTo: 'refunded'},
]

const STATUS_LABELS_FR: Record<FedaPayStatus, string> = {
    pending: 'En attente',
    approved: 'Approuvée',
    declined: 'Échouée',
    canceled: 'Annulée',
    refunded: 'Remboursée',
    transferred: 'Transférée',
    fraudulent: 'Frauduleuse',
    link_pending: 'Lien en attente',
    link_paid: 'Lien payé',
    link_failed: 'Lien échoué',
    link_canceled: 'Lien annulé',
    link_expired: 'Lien expiré',
}

const STATUS_TONE: Record<FedaPayStatus, string> = {
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    link_paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    transferred: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    link_pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    declined: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    link_failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    fraudulent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    refunded: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    canceled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    link_canceled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    link_expired: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

function formatAmount(amount: number, isoCurrency?: string): string {
    const code = isoCurrency ?? 'XOF'
    const value = amount.toLocaleString('fr-FR')
    return `${value} ${code === 'XOF' ? 'FCFA' : code}`
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleString('fr-FR', {dateStyle: 'short', timeStyle: 'short'})
    } catch {
        return iso
    }
}

export function PaymentsPage() {
    const [tab, setTab] = useState<StatusTab>('all')
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<ListResult | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            const status = TABS.find(t => t.id === tab)?.mapsTo
            if (status) params.set('status', status)
            params.set('perPage', '100')

            const res = await fetch(`/api/payments?${params.toString()}`, {cache: 'no-store'})
            const json = (await res.json()) as ListResult & {error?: string}
            if (!res.ok) {
                throw new Error(json.error ?? `payments_${res.status}`)
            }
            setData(json)
        } catch (err) {
            console.error('Erreur chargement paiements:', err)
            setError(err instanceof Error ? err.message : 'erreur_inconnue')
            notify.error(err)
            setData({transactions: [], total: 0})
        } finally {
            setLoading(false)
        }
    }, [tab])

    useEffect(() => {
        void load()
    }, [load])

    const transactions: FedaPayTransaction[] = data?.transactions ?? []

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return transactions
        return transactions.filter(tr => {
            const customer = formatCustomer(tr.customer).toLowerCase()
            return (
                tr.reference?.toLowerCase().includes(q) ||
                customer.includes(q) ||
                String(tr.id).includes(q)
            )
        })
    }, [transactions, search])

    const stats = useMemo(() => {
        const sumByStatus = (target: FedaPayStatus[]) =>
            transactions
                .filter(tr => target.includes(tr.status))
                .reduce((acc, tr) => acc + (tr.amount ?? 0), 0)
        return {
            approved: sumByStatus(['approved', 'transferred', 'link_paid']),
            pending: sumByStatus(['pending', 'link_pending']),
            count: transactions.length,
        }
    }, [transactions])

    const notConfigured = data?.skipped === 'fedapay_not_configured'

    return (
        <div className="p-6 bg-gray-50 dark:bg-black min-h-screen space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold text-black dark:text-white">Paiements</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Transactions FedaPay — vue admin.</p>
                </div>
                <button
                    onClick={() => void load()}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-4 py-2 text-sm font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-900 disabled:opacity-50 transition-colors"
                >
                    <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Rafraîchir
                </button>
            </div>

            {notConfigured && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-300">
                    FedaPay n&apos;est pas configuré. Ajoutez <code>FEDAPAY_API_KEY</code> et <code>FEDAPAY_ENVIRONMENT</code> dans les variables d&apos;environnement Vercel pour activer cette vue.
                </div>
            )}

            {!notConfigured && (
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-neutral-950">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Encaissé (approuvé)</p>
                        <p className="mt-1 text-3xl font-semibold text-black dark:text-white tabular-nums">
                            {loading ? '…' : formatAmount(stats.approved)}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-neutral-950">
                        <p className="text-sm text-gray-500 dark:text-gray-400">En attente</p>
                        <p className="mt-1 text-3xl font-semibold text-black dark:text-white tabular-nums">
                            {loading ? '…' : formatAmount(stats.pending)}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-neutral-950">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
                        <p className="mt-1 text-3xl font-semibold text-black dark:text-white tabular-nums">
                            {loading ? '…' : stats.count}
                        </p>
                    </div>
                </div>
            )}

            <div className="flex gap-2 flex-wrap">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                            tab === t.id
                                ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                                : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-900 dark:hover:border-gray-200'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par référence, client, ID…"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-black placeholder-gray-400 dark:border-gray-700 dark:bg-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
            />

            <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {loading ? (
                    <div className="divide-y divide-gray-100 dark:divide-gray-900">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="px-4 py-4 flex items-center gap-4">
                                <div className="h-9 w-24 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                                <div className="h-9 flex-1 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                                <div className="h-6 w-24 rounded-full bg-gray-100 dark:bg-gray-900 animate-pulse" />
                                <div className="h-6 w-20 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : error && !notConfigured ? (
                    <div className="p-12 text-center">
                        <BanknotesIcon className="mx-auto w-10 h-10 text-gray-400 dark:text-gray-600" />
                        <p className="mt-3 text-sm font-medium text-black dark:text-white">Erreur de chargement</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{error}</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        {search.trim() ? (
                            <>
                                <MagnifyingGlassIcon className="mx-auto w-10 h-10 text-gray-400 dark:text-gray-600" />
                                <p className="mt-3 text-sm font-medium text-black dark:text-white">
                                    Aucune transaction ne correspond à votre recherche.
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Essayez une autre référence, client ou ID.
                                </p>
                            </>
                        ) : (
                            <>
                                <BanknotesIcon className="mx-auto w-10 h-10 text-gray-400 dark:text-gray-600" />
                                <p className="mt-3 text-sm font-medium text-black dark:text-white">
                                    {tab === 'all' ? 'Aucune transaction.' : 'Aucune transaction dans cet onglet.'}
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {tab === 'all'
                                        ? 'Les paiements apparaîtront ici dès qu&apos;un client réglera via FedaPay.'
                                        : 'Bascule sur « Toutes » pour voir l&apos;ensemble.'}
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                            <tr>
                                {['Référence', 'Client', 'Montant', 'Mode', 'Statut', 'Date'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                            {filtered.map(tr => (
                                <tr key={tr.id} className="hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-black dark:text-white">{tr.reference || `#${tr.id}`}</div>
                                        {tr.description && <div className="text-xs text-gray-400 truncate max-w-[18ch]">{tr.description}</div>}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                        <div>{formatCustomer(tr.customer)}</div>
                                        {tr.customer?.email && <div className="text-xs text-gray-400">{tr.customer.email}</div>}
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-black dark:text-white tabular-nums">
                                        {formatAmount(tr.amount, tr.currency?.iso)}
                                    </td>
                                    <td className="px-4 py-3 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        {tr.mode ?? '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_TONE[tr.status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                                            {STATUS_LABELS_FR[tr.status] ?? tr.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        {formatDate(tr.approved_at ?? tr.created_at)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
