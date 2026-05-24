'use client'

import {useCallback, useEffect, useMemo, useState} from 'react'
import {
    ArrowPathIcon,
    BellIcon,
    ChatBubbleLeftRightIcon,
    EnvelopeIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline'
import {listNotificationsAction, type NotificationRow} from '@/app/actions/notifications-log'

type ChannelTab = 'all' | 'whatsapp' | 'email' | 'sms'

const TABS: ReadonlyArray<{id: ChannelTab; label: string}> = [
    {id: 'all', label: 'Tous'},
    {id: 'whatsapp', label: 'WhatsApp'},
    {id: 'email', label: 'Email'},
    {id: 'sms', label: 'SMS'},
]

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

export function NotificationsPage() {
    const [channel, setChannel] = useState<ChannelTab>('all')
    const [search, setSearch] = useState('')
    const [showOnlyFailed, setShowOnlyFailed] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [notifications, setNotifications] = useState<NotificationRow[]>([])

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await listNotificationsAction({
                channel,
                success: showOnlyFailed ? false : 'all',
                limit: 200,
            })
            if (!result.success) setError(result.error)
            setNotifications(result.notifications)
        } catch (err) {
            console.error('Erreur chargement notifications:', err)
            setError(err instanceof Error ? err.message : 'erreur_inconnue')
        } finally {
            setLoading(false)
        }
    }, [channel, showOnlyFailed])

    useEffect(() => {
        void load()
    }, [load])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return notifications
        return notifications.filter(n =>
            n.recipient.toLowerCase().includes(q) ||
            n.event_type.toLowerCase().includes(q) ||
            n.body.toLowerCase().includes(q),
        )
    }, [notifications, search])

    return (
        <div className="p-6 bg-gray-50 dark:bg-black min-h-screen space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold text-black dark:text-white">Notifications</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Journal des envois WhatsApp / email / SMS sortants.</p>
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

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2 flex-wrap">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setChannel(t.id)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                                channel === t.id
                                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                                    : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-900 dark:hover:border-gray-200'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={showOnlyFailed}
                        onChange={e => setShowOnlyFailed(e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-700"
                    />
                    Échecs uniquement
                </label>
            </div>

            <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par destinataire, évènement, contenu…"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-black placeholder-gray-400 dark:border-gray-700 dark:bg-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
            />

            <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {loading ? (
                    <div className="divide-y divide-gray-100 dark:divide-gray-900">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="px-4 py-4 flex items-center gap-4">
                                <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-900 animate-pulse" />
                                <div className="h-9 flex-1 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                                <div className="h-6 w-20 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        {search.trim() ? (
                            <>
                                <MagnifyingGlassIcon className="mx-auto w-10 h-10 text-gray-400 dark:text-gray-600" />
                                <p className="mt-3 text-sm font-medium text-black dark:text-white">
                                    Aucune notification ne correspond à votre recherche.
                                </p>
                            </>
                        ) : (
                            <>
                                <BellIcon className="mx-auto w-10 h-10 text-gray-400 dark:text-gray-600" />
                                <p className="mt-3 text-sm font-medium text-black dark:text-white">
                                    {channel === 'all' ? 'Aucune notification envoyée pour l\'instant.' : 'Rien à afficher dans ce canal.'}
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Les notifications apparaîtront ici dès qu&apos;un évènement métier déclenchera un envoi.
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-900">
                        {filtered.map(n => {
                            const Icon = CHANNEL_ICON[n.channel] ?? BellIcon
                            return (
                                <li key={n.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-black dark:text-white text-sm">{n.event_type}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">→ {n.recipient}</span>
                                            {n.success ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                    <CheckCircleIcon className="w-3 h-3" />
                                                    Envoyé
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                                    <XCircleIcon className="w-3 h-3" />
                                                    Échec
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-gray-700 dark:text-gray-300 line-clamp-2 whitespace-pre-line">
                                            {n.body}
                                        </p>
                                        {n.error && (
                                            <p className="mt-1 text-xs text-red-600 dark:text-red-400 line-clamp-1">{n.error}</p>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(n.sent_at)}</span>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        </div>
    )
}
