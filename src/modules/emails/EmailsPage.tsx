'use client'

import {useCallback, useEffect, useMemo, useState} from 'react'
import {
    ArrowPathIcon,
    EnvelopeIcon,
    MagnifyingGlassIcon,
    CheckCircleIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline'
import {listNotificationsAction, type NotificationRow} from '@/app/actions/notifications-log'

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleString('fr-FR', {dateStyle: 'short', timeStyle: 'short'})
    } catch {
        return iso
    }
}

export function EmailsPage() {
    const [search, setSearch] = useState('')
    const [showOnlyFailed, setShowOnlyFailed] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [emails, setEmails] = useState<NotificationRow[]>([])
    const [selected, setSelected] = useState<NotificationRow | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await listNotificationsAction({
                channel: 'email',
                success: showOnlyFailed ? false : 'all',
                limit: 200,
            })
            if (!result.success) setError(result.error)
            setEmails(result.notifications)
        } catch (err) {
            console.error('Erreur chargement emails:', err)
            setError(err instanceof Error ? err.message : 'erreur_inconnue')
        } finally {
            setLoading(false)
        }
    }, [showOnlyFailed])

    useEffect(() => {
        void load()
    }, [load])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return emails
        return emails.filter(e =>
            e.recipient.toLowerCase().includes(q) ||
            (e.subject ?? '').toLowerCase().includes(q) ||
            e.event_type.toLowerCase().includes(q),
        )
    }, [emails, search])

    const stats = useMemo(() => {
        const sent = emails.filter(e => e.success).length
        const failed = emails.filter(e => !e.success).length
        const rate = emails.length === 0 ? 0 : Math.round((sent / emails.length) * 100)
        return {sent, failed, rate, total: emails.length}
    }, [emails])

    return (
        <div className="p-6 bg-gray-50 dark:bg-black min-h-screen space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold text-black dark:text-white">Emails</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Journal des emails Resend transactionnels.</p>
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

            <div className="grid gap-4 sm:grid-cols-4">
                {[
                    {label: 'Envoyés', value: stats.sent},
                    {label: 'Échoués', value: stats.failed},
                    {label: 'Taux succès', value: `${stats.rate}%`},
                    {label: 'Total', value: stats.total},
                ].map(card => (
                    <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-neutral-950">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                        {loading ? (
                            <div className="mt-2 h-7 w-16 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                        ) : (
                            <p className="mt-2 text-2xl font-semibold text-black dark:text-white tabular-nums">{card.value}</p>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
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
                placeholder="Rechercher par destinataire, sujet, évènement…"
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
                                    Aucun email ne correspond à votre recherche.
                                </p>
                            </>
                        ) : (
                            <>
                                <EnvelopeIcon className="mx-auto w-10 h-10 text-gray-400 dark:text-gray-600" />
                                <p className="mt-3 text-sm font-medium text-black dark:text-white">
                                    Aucun email envoyé pour l&apos;instant.
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    Les emails transactionnels Resend apparaîtront ici dès qu&apos;un évènement les déclenchera.
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-900">
                        {filtered.map(e => (
                            <li
                                key={e.id}
                                onClick={() => setSelected(e)}
                                className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors cursor-pointer"
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                                    <EnvelopeIcon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-black dark:text-white text-sm truncate">
                                            {e.subject ?? e.event_type}
                                        </span>
                                        {e.success ? (
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
                                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                                        → {e.recipient} · {e.event_type}
                                    </div>
                                    {e.error && (
                                        <p className="mt-1 text-xs text-red-600 dark:text-red-400 line-clamp-1">{e.error}</p>
                                    )}
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(e.sent_at)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {selected && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
                    <div className="bg-white dark:bg-black rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-gray-300 dark:border-gray-700" onClick={ev => ev.stopPropagation()}>
                        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <h3 className="text-lg font-semibold text-black dark:text-white truncate">{selected.subject ?? selected.event_type}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    → {selected.recipient} · {formatDate(selected.sent_at)}
                                </p>
                            </div>
                            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-black dark:hover:text-white">
                                <XCircleIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5">
                            {selected.body.trim().startsWith('<') ? (
                                <iframe
                                    srcDoc={selected.body}
                                    className="w-full h-[50vh] rounded-lg border border-gray-200 dark:border-gray-800 bg-white"
                                    sandbox=""
                                    title="Aperçu email"
                                />
                            ) : (
                                <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">{selected.body}</pre>
                            )}
                            {selected.error && (
                                <p className="mt-3 text-xs text-red-600 dark:text-red-400">{selected.error}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
