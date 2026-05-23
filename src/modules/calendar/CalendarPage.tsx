'use client'

import {useCallback, useEffect, useMemo, useState} from 'react'
import {ArrowPathIcon, CalendarDaysIcon, MapPinIcon, PhoneIcon, UserIcon} from '@heroicons/react/24/outline'
import {getUpcomingAppointmentsAction, type AppointmentRow} from '@/app/actions/calendar'

function formatDay(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})
}

function groupByDay(items: AppointmentRow[]): Array<{day: string; items: AppointmentRow[]}> {
    const buckets = new Map<string, AppointmentRow[]>()
    for (const item of items) {
        const key = item.appointmentDate.slice(0, 10)
        if (!buckets.has(key)) buckets.set(key, [])
        buckets.get(key)!.push(item)
    }
    return [...buckets.entries()]
        .map(([day, list]) => ({day, items: list}))
        .sort((a, b) => a.day.localeCompare(b.day))
}

export function CalendarPage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [appointments, setAppointments] = useState<AppointmentRow[]>([])

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await getUpcomingAppointmentsAction({days: 30})
            if (!result.success) setError(result.error)
            setAppointments(result.appointments)
        } catch (err) {
            console.error('Erreur chargement RDV:', err)
            setError(err instanceof Error ? err.message : 'erreur_inconnue')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    const grouped = useMemo(() => groupByDay(appointments), [appointments])

    return (
        <div className="p-6 bg-gray-50 dark:bg-black min-h-screen space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold text-black dark:text-white">Calendrier</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Rendez-vous mesures et visites prévues sur les 30 prochains jours.</p>
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
                    {error === 'forbidden' ? 'Ce module est réservé aux professionnels.' : `Erreur: ${error}`}
                </div>
            )}

            {loading ? (
                <div className="space-y-3">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-gray-900 animate-pulse" />
                    ))}
                </div>
            ) : grouped.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
                    <CalendarDaysIcon className="mx-auto w-10 h-10 text-gray-400 dark:text-gray-600" />
                    <p className="mt-3 text-sm font-medium text-black dark:text-white">Aucun rendez-vous prévu.</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Les RDV apparaîtront ici dès qu&apos;une commande aura une date d&apos;appointment.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {grouped.map(group => (
                        <section key={group.day}>
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                                {formatDay(group.day + 'T00:00:00')}
                            </h2>
                            <div className="space-y-3">
                                {group.items.map(item => (
                                    <div
                                        key={item.orderId}
                                        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-neutral-950 flex items-start gap-4"
                                    >
                                        <div className="flex flex-col items-center justify-center min-w-[64px] rounded-xl bg-gray-100 dark:bg-gray-900 px-3 py-2">
                                            <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">À</span>
                                            <span className="text-lg font-semibold text-black dark:text-white tabular-nums">{formatTime(item.appointmentDate)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <UserIcon className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium text-black dark:text-white truncate">{item.customerName}</span>
                                                {item.orderNumber && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">#{item.orderNumber}</span>
                                                )}
                                            </div>
                                            {item.customerPhone && (
                                                <div className="mt-1 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                    <PhoneIcon className="w-3.5 h-3.5" />
                                                    {item.customerPhone}
                                                </div>
                                            )}
                                            {(item.specificLocation || item.location) && (
                                                <div className="mt-1 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                    <MapPinIcon className="w-3.5 h-3.5" />
                                                    {item.specificLocation ?? item.location}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    )
}
