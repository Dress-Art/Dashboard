'use client'

import {useCallback, useEffect, useState} from 'react'
import Link from 'next/link'
import {
    ArrowPathIcon,
    ArrowTopRightOnSquareIcon,
    BanknotesIcon,
    CalendarDaysIcon,
    CheckBadgeIcon,
    NoSymbolIcon,
    PencilSquareIcon,
    RectangleStackIcon,
    ShoppingBagIcon,
    StarIcon,
    UsersIcon,
} from '@heroicons/react/24/outline'
import {
    getCouturierHomeStatsAction,
    listCouturierRecentOrdersAction,
    type CouturierHomeStats,
    type CouturierOrderRow,
} from '@/app/actions/couturier-home'
import {getUpcomingAppointmentsAction, type AppointmentRow} from '@/app/actions/calendar'
import {ORDER_STATUS_LABELS_FR, type OrderStatus} from '@/types/order.types'

function formatFCFA(n: number): string {
    return `${n.toLocaleString('fr-FR')} FCFA`
}

function formatDateShort(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('fr-FR', {day: '2-digit', month: 'short'})
    } catch {
        return iso
    }
}

function formatTime(iso: string): string {
    try {
        return new Date(iso).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})
    } catch {
        return ''
    }
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

interface KpiCard {
    label: string
    value: string | number
    icon: typeof StarIcon
    href: string
}

export function CouturierHome() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<CouturierHomeStats | null>(null)
    const [orders, setOrders] = useState<CouturierOrderRow[]>([])
    const [appointments, setAppointments] = useState<AppointmentRow[]>([])

    const load = useCallback(async () => {
        setLoading(true)
        const [statsRes, ordersRes, appointmentsRes] = await Promise.allSettled([
            getCouturierHomeStatsAction(),
            listCouturierRecentOrdersAction(10),
            getUpcomingAppointmentsAction({days: 7}),
        ])

        if (statsRes.status === 'fulfilled') setStats(statsRes.value.stats)
        if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.orders)
        if (appointmentsRes.status === 'fulfilled') setAppointments(appointmentsRes.value.appointments.slice(0, 5))
        setLoading(false)
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    const cards: KpiCard[] = [
        {label: 'Commandes en cours', value: stats?.ordersInProgress ?? 0, icon: ShoppingBagIcon, href: '/modules/orders'},
        {label: 'Revenue 30j', value: stats ? formatFCFA(stats.revenue30d) : '—', icon: BanknotesIcon, href: '/modules/orders'},
        {label: 'Modèles', value: stats?.modelsCount ?? 0, icon: RectangleStackIcon, href: '/modules/couturier?tab=models'},
        {label: 'Clients', value: stats?.clientsCount ?? 0, icon: UsersIcon, href: '/modules/couturier?tab=clients'},
        {label: 'RDV cette semaine', value: stats?.appointmentsUpcoming ?? 0, icon: CalendarDaysIcon, href: '/modules/calendar'},
        {label: 'Note moyenne', value: stats ? stats.averageRating.toFixed(2) : '—', icon: StarIcon, href: '/me/profile'},
        {label: 'Avis reçus', value: stats?.totalReviews ?? 0, icon: PencilSquareIcon, href: '/me/profile'},
    ]

    return (
        <div className="space-y-6">
            <header className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold text-black dark:text-white">Tableau de bord</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Vos chiffres clés en un coup d&apos;œil.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {stats && (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                            stats.isAcceptingOrders
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                            {stats.isAcceptingOrders ? <CheckBadgeIcon className="w-3.5 h-3.5" /> : <NoSymbolIcon className="w-3.5 h-3.5" />}
                            {stats.isAcceptingOrders ? 'Vous acceptez les commandes' : 'Commandes désactivées'}
                        </span>
                    )}
                    <button
                        onClick={() => void load()}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-4 py-2 text-sm font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-900 disabled:opacity-50 transition-colors"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Rafraîchir
                    </button>
                </div>
            </header>

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

            <div className="grid gap-4 lg:grid-cols-2">
                {/* Commandes récentes */}
                <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-neutral-950">
                    <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-black dark:text-white">Mes commandes récentes</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">10 dernières assignées via vos modèles.</p>
                        </div>
                        <Link
                            href="/modules/orders"
                            className="text-xs font-medium text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white inline-flex items-center gap-1"
                        >
                            Tout voir
                            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        </Link>
                    </header>
                    <div className="divide-y divide-gray-100 dark:divide-gray-900">
                        {loading ? (
                            [0, 1, 2].map(i => <div key={i} className="px-5 py-3 h-14 bg-gray-50 dark:bg-neutral-900/40 animate-pulse" />)
                        ) : orders.length === 0 ? (
                            <div className="p-8 text-center">
                                <ShoppingBagIcon className="mx-auto w-8 h-8 text-gray-400 dark:text-gray-600" />
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Aucune commande pour l&apos;instant.</p>
                            </div>
                        ) : (
                            orders.map(o => (
                                <div key={o.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-neutral-900/60 transition-colors">
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
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{formatDateShort(o.createdAt)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* RDV à venir */}
                <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-neutral-950">
                    <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-black dark:text-white">RDV à venir</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Prises de mesures cette semaine.</p>
                        </div>
                        <Link
                            href="/modules/calendar"
                            className="text-xs font-medium text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white inline-flex items-center gap-1"
                        >
                            Tout voir
                            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        </Link>
                    </header>
                    <div className="divide-y divide-gray-100 dark:divide-gray-900">
                        {loading ? (
                            [0, 1, 2].map(i => <div key={i} className="px-5 py-3 h-14 bg-gray-50 dark:bg-neutral-900/40 animate-pulse" />)
                        ) : appointments.length === 0 ? (
                            <div className="p-8 text-center">
                                <CalendarDaysIcon className="mx-auto w-8 h-8 text-gray-400 dark:text-gray-600" />
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Aucun RDV prévu cette semaine.</p>
                            </div>
                        ) : (
                            appointments.map(a => (
                                <div key={a.orderId} className="px-5 py-3 flex items-center gap-3">
                                    <div className="flex flex-col items-center justify-center min-w-[52px] rounded-xl bg-gray-100 dark:bg-gray-900 px-2 py-1.5">
                                        <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{formatDateShort(a.appointmentDate)}</span>
                                        <span className="text-sm font-semibold text-black dark:text-white tabular-nums">{formatTime(a.appointmentDate)}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-black dark:text-white text-sm truncate">{a.customerName}</p>
                                        {(a.specificLocation || a.location) && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{a.specificLocation ?? a.location}</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}
