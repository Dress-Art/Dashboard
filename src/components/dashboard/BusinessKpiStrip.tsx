'use client'

import {useCallback, useEffect, useState} from 'react'
import Link from 'next/link'
import {
    ArrowPathIcon,
    ArrowTopRightOnSquareIcon,
    BanknotesIcon,
    PencilSquareIcon,
    RectangleStackIcon,
    ShoppingBagIcon,
    TruckIcon,
    UserGroupIcon,
    UsersIcon,
} from '@heroicons/react/24/outline'
import {getHomeStatsAction, type HomeStats} from '@/app/actions/home-stats'

interface KpiCard {
    label: string
    value: string | number
    icon: typeof UserGroupIcon
    href: string
}

function formatFCFA(n: number): string {
    return `${n.toLocaleString('fr-FR')} FCFA`
}

export function BusinessKpiStrip() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<HomeStats | null>(null)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await getHomeStatsAction()
            if (!result.success) setError(result.error)
            setData(result.data)
        } catch (err) {
            console.error('Erreur chargement KPI home:', err)
            setError(err instanceof Error ? err.message : 'erreur_inconnue')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    if (error === 'forbidden') {
        // Pas affiché aux non-admins ; le composant retourne null pour rester invisible.
        return null
    }

    const cards: KpiCard[] = [
        {
            label: 'Revenue 30j',
            value: data ? formatFCFA(data.revenue30d) : '—',
            icon: BanknotesIcon,
            href: '/modules/analytics',
        },
        {
            label: 'Couturiers',
            value: data?.couturiers ?? 0,
            icon: UserGroupIcon,
            href: '/modules/couturier',
        },
        {
            label: 'Commandes',
            value: data?.orders ?? 0,
            icon: ShoppingBagIcon,
            href: '/modules/orders',
        },
        {
            label: 'Clients',
            value: data?.clients ?? 0,
            icon: UsersIcon,
            href: '/modules/couturier?tab=clients',
        },
        {
            label: 'Modèles',
            value: data?.models ?? 0,
            icon: RectangleStackIcon,
            href: '/modules/couturier?tab=models',
        },
        {
            label: 'Mesures',
            value: data?.measurements ?? 0,
            icon: PencilSquareIcon,
            href: '/modules/couturier?tab=measurements',
        },
        {
            label: 'Livraisons en cours',
            value: data?.deliveriesInFlight ?? 0,
            icon: TruckIcon,
            href: '/modules/delivery',
        },
    ]

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-black dark:text-white">Vue d&apos;ensemble</h2>
                <button
                    onClick={() => void load()}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white disabled:opacity-50 transition-colors"
                    aria-label="Rafraîchir les KPI"
                >
                    <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Rafraîchir
                </button>
            </div>

            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                {cards.map(card => {
                    const Icon = card.icon
                    return (
                        <Link
                            key={card.label}
                            href={card.href}
                            className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-neutral-950 dark:hover:border-gray-700"
                        >
                            <div className="flex items-start justify-between">
                                <div className="rounded-xl bg-gray-100 p-2 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                    <Icon className="w-4 h-4" />
                                </div>
                                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-600 dark:text-gray-700 dark:group-hover:text-gray-400 transition-colors" />
                            </div>
                            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                            {loading ? (
                                <div className="mt-1 h-7 w-20 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                            ) : (
                                <p className="mt-1 text-xl font-semibold text-black dark:text-white tabular-nums truncate">
                                    {card.value}
                                </p>
                            )}
                        </Link>
                    )
                })}
            </div>
        </section>
    )
}
