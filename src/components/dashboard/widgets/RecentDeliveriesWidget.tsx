'use client'

import {useCallback, useEffect, useState} from 'react'
import Link from 'next/link'
import {ArrowPathIcon, ArrowTopRightOnSquareIcon, TruckIcon} from '@heroicons/react/24/outline'
import {listRecentDeliveriesAction, type RecentDeliveryRow} from '@/app/actions/home-feed'
import {DELIVERY_STATUS_LABELS_FR, type DeliveryStatus} from '@/types/delivery.types'

const STATUS_TONE: Record<DeliveryStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    picked_up: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    in_transit: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('fr-FR', {day: '2-digit', month: 'short'})
    } catch {
        return iso
    }
}

export function RecentDeliveriesWidget() {
    const [loading, setLoading] = useState(true)
    const [deliveries, setDeliveries] = useState<RecentDeliveryRow[]>([])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const result = await listRecentDeliveriesAction(10)
            setDeliveries(result.deliveries)
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
                    <h2 className="text-lg font-semibold text-black dark:text-white">Livraisons récentes</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">10 dernières livraisons créées.</p>
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
                        href="/modules/delivery"
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
                ) : deliveries.length === 0 ? (
                    <div className="p-8 text-center">
                        <TruckIcon className="mx-auto w-8 h-8 text-gray-400 dark:text-gray-600" />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Aucune livraison pour l&apos;instant.</p>
                    </div>
                ) : (
                    deliveries.map(d => (
                        <div key={d.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-neutral-900/60 transition-colors">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                                <TruckIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-black dark:text-white text-sm">
                                        #{d.orderId.slice(0, 8).toUpperCase()}
                                    </span>
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_TONE[d.status]}`}>
                                        {DELIVERY_STATUS_LABELS_FR[d.status]}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {d.customerName} · {d.driverName ?? 'Non assigné'}
                                </p>
                            </div>
                            <div className="text-right whitespace-nowrap">
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">{formatDate(d.createdAt)}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    )
}
