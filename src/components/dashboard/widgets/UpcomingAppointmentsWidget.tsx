'use client'

import {useCallback, useEffect, useState} from 'react'
import Link from 'next/link'
import {
    ArrowPathIcon,
    ArrowTopRightOnSquareIcon,
    CalendarDaysIcon,
    MapPinIcon,
} from '@heroicons/react/24/outline'
import {getUpcomingAppointmentsAction, type AppointmentRow} from '@/app/actions/calendar'

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

export function UpcomingAppointmentsWidget() {
    const [loading, setLoading] = useState(true)
    const [appointments, setAppointments] = useState<AppointmentRow[]>([])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const result = await getUpcomingAppointmentsAction({days: 7})
            setAppointments(result.appointments.slice(0, 10))
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
                    <h2 className="text-lg font-semibold text-black dark:text-white">RDV à venir</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">7 prochains jours.</p>
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
                        href="/modules/calendar"
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
                            <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-900 animate-pulse" />
                            <div className="h-9 flex-1 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                        </div>
                    ))
                ) : appointments.length === 0 ? (
                    <div className="p-8 text-center">
                        <CalendarDaysIcon className="mx-auto w-8 h-8 text-gray-400 dark:text-gray-600" />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Aucun RDV prévu cette semaine.</p>
                    </div>
                ) : (
                    appointments.map(a => (
                        <div key={a.orderId} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-neutral-900/60 transition-colors">
                            <div className="flex flex-col items-center justify-center min-w-[52px] rounded-xl bg-gray-100 dark:bg-gray-900 px-2 py-1.5">
                                <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{formatDateShort(a.appointmentDate)}</span>
                                <span className="text-sm font-semibold text-black dark:text-white tabular-nums">{formatTime(a.appointmentDate)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-black dark:text-white text-sm truncate">{a.customerName}</p>
                                {(a.specificLocation || a.location) && (
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate inline-flex items-center gap-1">
                                        <MapPinIcon className="w-3 h-3" />
                                        {a.specificLocation ?? a.location}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    )
}
