'use client'

import {useCallback, useEffect, useState} from 'react'
import Link from 'next/link'
import {ArrowPathIcon, ArrowTopRightOnSquareIcon, ShoppingBagIcon} from '@heroicons/react/24/outline'
import {listRecentOrdersAction, type RecentOrderRow} from '@/app/actions/home-feed'
import {ORDER_STATUS_LABELS_FR, type OrderStatus} from '@/types/order.types'

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

function formatFCFA(n: number): string {
    return `${n.toLocaleString('fr-FR')} FCFA`
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('fr-FR', {day: '2-digit', month: 'short'})
    } catch {
        return iso
    }
}

export function RecentOrdersWidget() {
    const [loading, setLoading] = useState(true)
    const [orders, setOrders] = useState<RecentOrderRow[]>([])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const result = await listRecentOrdersAction(10)
            setOrders(result.orders)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    return (
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-neutral-950">
            <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-black dark:text-white">Commandes récentes</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">10 dernières commandes créées.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => void load()}
                        disabled={loading}
                        className="p-1.5 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white disabled:opacity-50 transition-colors"
                        aria-label="Rafraîchir"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <Link
                        href="/modules/orders"
                        className="text-xs font-medium text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white inline-flex items-center gap-1"
                    >
                        Tout voir
                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </header>

            <div className="divide-y divide-gray-100 dark:divide-gray-900">
                {loading ? (
                    [0, 1, 2, 3].map(i => (
                        <div key={i} className="px-5 py-3 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-900 animate-pulse" />
                            <div className="h-9 flex-1 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                        </div>
                    ))
                ) : orders.length === 0 ? (
                    <div className="p-8 text-center">
                        <ShoppingBagIcon className="mx-auto w-8 h-8 text-gray-400 dark:text-gray-600" />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Aucune commande pour l&apos;instant.</p>
                    </div>
                ) : (
                    orders.map(o => (
                        <div key={o.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-neutral-900/60 transition-colors">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                                <ShoppingBagIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-black dark:text-white text-sm">
                                        #{o.orderNumber ?? o.id.slice(0, 8).toUpperCase()}
                                    </span>
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_TONE[o.status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                                        {statusLabel(o.status)}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {o.customerName}
                                    {o.modelName && ` · ${o.modelName}`}
                                </p>
                            </div>
                            <div className="text-right whitespace-nowrap">
                                <p className="text-sm font-semibold text-black dark:text-white tabular-nums">{formatFCFA(o.totalAmount)}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">{formatDate(o.createdAt)}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    )
}
