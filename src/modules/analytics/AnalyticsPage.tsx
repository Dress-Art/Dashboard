'use client'

import {useCallback, useEffect, useState} from 'react'
import {ArrowPathIcon, ChartBarIcon} from '@heroicons/react/24/outline'
import {getAdminAnalyticsAction, type AdminAnalytics} from '@/app/actions/analytics'
import {ORDER_STATUS_LABELS_FR, type OrderStatus} from '@/types/order.types'

function formatFCFA(n: number): string {
    return `${n.toLocaleString('fr-FR')} FCFA`
}

const STATUS_TONE: Record<string, string> = {
    confirmed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    paid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    measurements_validated: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    sewing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    finishing: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
    ready_for_delivery: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

function statusLabel(status: string): string {
    return ORDER_STATUS_LABELS_FR[status as OrderStatus] ?? status
}

export function AnalyticsPage() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<AdminAnalytics | null>(null)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await getAdminAnalyticsAction()
            if (!result.success) {
                setError(result.error)
            }
            setData(result.data)
        } catch (err) {
            console.error('Erreur chargement analytics:', err)
            setError(err instanceof Error ? err.message : 'erreur_inconnue')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    const kpis = [
        {label: 'Revenue 30j', value: data ? formatFCFA(data.revenue30d) : '—'},
        {label: 'Encaissé total', value: data ? formatFCFA(data.cashed) : '—'},
        {label: 'Commandes 30j', value: data ? data.orders30d.toString() : '—'},
        {label: 'Commandes (total)', value: data ? data.ordersTotal.toString() : '—'},
        {label: 'Livraisons 30j', value: data ? data.deliveries30d.toString() : '—'},
        {label: 'Taux succès livraison 30j', value: data ? `${data.deliverySuccessRate30d}%` : '—'},
    ]

    const statusEntries = data ? Object.entries(data.ordersByStatus).sort((a, b) => b[1] - a[1]) : []
    const statusTotal = statusEntries.reduce((s, [, c]) => s + c, 0)

    return (
        <div className="p-6 bg-gray-50 dark:bg-black min-h-screen space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold text-black dark:text-white">Analytique</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Vue admin : revenue, commandes, livraisons, top couturiers (données réelles).</p>
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

            {error && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-300">
                    {error === 'forbidden' ? 'Cette page est réservée à l\'admin.' : `Erreur: ${error}`}
                </div>
            )}

            <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {kpis.map(k => (
                    <div key={k.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-neutral-950">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{k.label}</p>
                        {loading ? (
                            <div className="mt-2 h-7 w-20 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                        ) : (
                            <p className="mt-2 text-xl font-semibold text-black dark:text-white tabular-nums">{k.value}</p>
                        )}
                    </div>
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-neutral-950">
                    <h2 className="text-lg font-semibold text-black dark:text-white">Commandes par statut</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Répartition actuelle, toutes périodes.</p>
                    {loading ? (
                        <div className="mt-4 space-y-2">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className="h-8 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                            ))}
                        </div>
                    ) : statusEntries.length === 0 ? (
                        <div className="mt-6 text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                            <ChartBarIcon className="mx-auto w-10 h-10 text-gray-400 dark:text-gray-600 mb-2" />
                            Pas encore de commandes.
                        </div>
                    ) : (
                        <ul className="mt-4 space-y-2">
                            {statusEntries.map(([status, count]) => {
                                const pct = statusTotal === 0 ? 0 : Math.round((count / statusTotal) * 100)
                                const tone = STATUS_TONE[status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                return (
                                    <li key={status} className="flex items-center gap-3">
                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${tone} whitespace-nowrap`}>
                                            {statusLabel(status)}
                                        </span>
                                        <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-900 overflow-hidden">
                                            <div className="h-full bg-black dark:bg-white" style={{width: `${pct}%`}} />
                                        </div>
                                        <span className="text-sm font-semibold text-black dark:text-white tabular-nums w-10 text-right">{count}</span>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-neutral-950">
                    <h2 className="text-lg font-semibold text-black dark:text-white">Top couturiers</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Classement par nombre de commandes assignées.</p>
                    {loading ? (
                        <div className="mt-4 space-y-2">
                            {[0, 1, 2, 3, 4].map(i => (
                                <div key={i} className="h-10 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                            ))}
                        </div>
                    ) : data && data.topCouturiers.length === 0 ? (
                        <div className="mt-6 text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                            Aucun couturier assigné pour l&apos;instant.
                        </div>
                    ) : (
                        <ol className="mt-4 space-y-2">
                            {data?.topCouturiers.map((c, idx) => (
                                <li key={c.userId} className="flex items-center gap-3">
                                    <span className="w-6 h-6 inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200">
                                        {idx + 1}
                                    </span>
                                    <span className="flex-1 text-sm text-black dark:text-white truncate">{c.name}</span>
                                    <span className="text-sm font-semibold text-black dark:text-white tabular-nums">{c.ordersCount}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            </div>
        </div>
    )
}
