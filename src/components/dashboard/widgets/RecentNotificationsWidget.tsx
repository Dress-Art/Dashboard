'use client'

import {useCallback, useEffect, useState} from 'react'
import Link from 'next/link'
import {
    ArrowPathIcon,
    ArrowTopRightOnSquareIcon,
    BellIcon,
    ChatBubbleLeftRightIcon,
    EnvelopeIcon,
    CheckCircleIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline'
import {listNotificationsAction, type NotificationRow} from '@/app/actions/notifications-log'

const CHANNEL_ICON: Record<NotificationRow['channel'], typeof BellIcon> = {
    whatsapp: ChatBubbleLeftRightIcon,
    email: EnvelopeIcon,
    sms: BellIcon,
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleString('fr-FR', {dateStyle: 'short', timeStyle: 'short'})
    } catch {
        return iso
    }
}

export function RecentNotificationsWidget() {
    const [loading, setLoading] = useState(true)
    const [notifications, setNotifications] = useState<NotificationRow[]>([])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const result = await listNotificationsAction({limit: 10})
            setNotifications(result.notifications)
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
                    <h2 className="text-lg font-semibold text-black dark:text-white">Notifications récentes</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">10 derniers envois WhatsApp / email.</p>
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
                        href="/modules/notifications"
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
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                        <BellIcon className="mx-auto w-8 h-8 text-gray-400 dark:text-gray-600" />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Aucune notification envoyée pour l&apos;instant.</p>
                    </div>
                ) : (
                    notifications.map(n => {
                        const Icon = CHANNEL_ICON[n.channel] ?? BellIcon
                        return (
                            <div key={n.id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-neutral-900/60 transition-colors">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-black dark:text-white text-xs truncate">{n.event_type}</span>
                                        {n.success ? (
                                            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                                        ) : (
                                            <XCircleIcon className="w-3.5 h-3.5 text-red-500" />
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">→ {n.recipient}</p>
                                </div>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(n.sent_at)}</span>
                            </div>
                        )
                    })
                )}
            </div>
        </section>
    )
}
