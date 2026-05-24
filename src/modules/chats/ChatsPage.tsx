'use client'

import {useCallback, useEffect, useMemo, useState} from 'react'
import {
    ArrowPathIcon,
    ChatBubbleLeftRightIcon,
    MagnifyingGlassIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import {
    listChatThreadsAction,
    getChatThreadAction,
    type ChatThreadSummary,
    type InboundMessage,
    type OutboundMessage,
} from '@/app/actions/chats'

type ThreadItem =
    | (InboundMessage & {kind: 'in'; at: string})
    | (OutboundMessage & {kind: 'out'; at: string})

function formatTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString('fr-FR', {dateStyle: 'short', timeStyle: 'short'})
    } catch {
        return iso
    }
}

function shortBody(body: string | null | undefined, max = 80): string {
    if (!body) return '—'
    const s = body.replace(/\s+/g, ' ').trim()
    return s.length <= max ? s : s.slice(0, max) + '…'
}

export function ChatsPage() {
    const [threads, setThreads] = useState<ChatThreadSummary[]>([])
    const [loadingThreads, setLoadingThreads] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const [activePhone, setActivePhone] = useState<string | null>(null)
    const [loadingThread, setLoadingThread] = useState(false)
    const [threadItems, setThreadItems] = useState<ThreadItem[]>([])

    const loadThreads = useCallback(async () => {
        setLoadingThreads(true)
        setError(null)
        try {
            const result = await listChatThreadsAction()
            if (!result.success) setError(result.error)
            setThreads(result.threads)
            if (!activePhone && result.threads.length > 0) {
                setActivePhone(result.threads[0].phone)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'erreur_inconnue')
        } finally {
            setLoadingThreads(false)
        }
    }, [activePhone])

    useEffect(() => {
        void loadThreads()
    }, [loadThreads])

    const loadThread = useCallback(async (phone: string) => {
        setLoadingThread(true)
        try {
            const result = await getChatThreadAction(phone)
            if (!result.success) {
                setThreadItems([])
                return
            }
            const inbound: ThreadItem[] = result.inbound.map(m => ({...m, kind: 'in', at: m.received_at}))
            const outbound: ThreadItem[] = result.outbound.map(m => ({...m, kind: 'out', at: m.sent_at}))
            const merged = [...inbound, ...outbound].sort((a, b) => a.at.localeCompare(b.at))
            setThreadItems(merged)
        } finally {
            setLoadingThread(false)
        }
    }, [])

    useEffect(() => {
        if (activePhone) void loadThread(activePhone)
    }, [activePhone, loadThread])

    const filteredThreads = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return threads
        return threads.filter(t =>
            t.phone.toLowerCase().includes(q) ||
            (t.lastMessageBody ?? '').toLowerCase().includes(q),
        )
    }, [threads, search])

    return (
        <div className="p-6 bg-gray-50 dark:bg-black min-h-screen space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold text-black dark:text-white">Chats WhatsApp</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Messages entrants via Evolution API, regroupés par numéro.</p>
                </div>
                <button
                    onClick={() => void loadThreads()}
                    disabled={loadingThreads}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-4 py-2 text-sm font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-900 disabled:opacity-50 transition-colors"
                >
                    <ArrowPathIcon className={`w-4 h-4 ${loadingThreads ? 'animate-spin' : ''}`} />
                    Rafraîchir
                </button>
            </div>

            {error && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-300">
                    {error === 'forbidden' ? 'Cette page est réservée à l\'admin.' : `Erreur: ${error}`}
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                <aside className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-neutral-950 overflow-hidden">
                    <div className="p-3 border-b border-gray-100 dark:border-gray-900">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher un numéro…"
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-sm text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
                        />
                    </div>
                    {loadingThreads ? (
                        <div className="p-3 space-y-2">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="h-14 rounded-lg bg-gray-100 dark:bg-gray-900 animate-pulse" />
                            ))}
                        </div>
                    ) : filteredThreads.length === 0 ? (
                        <div className="p-8 text-center">
                            {search.trim() ? (
                                <MagnifyingGlassIcon className="mx-auto w-8 h-8 text-gray-400 dark:text-gray-600" />
                            ) : (
                                <ChatBubbleLeftRightIcon className="mx-auto w-8 h-8 text-gray-400 dark:text-gray-600" />
                            )}
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                {search.trim() ? 'Aucun fil trouvé.' : 'Aucun message entrant.'}
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-900 max-h-[70vh] overflow-y-auto">
                            {filteredThreads.map(t => {
                                const isActive = t.phone === activePhone
                                return (
                                    <li
                                        key={t.phone}
                                        onClick={() => setActivePhone(t.phone)}
                                        className={`px-3 py-3 cursor-pointer transition-colors ${
                                            isActive
                                                ? 'bg-gray-100 dark:bg-neutral-900'
                                                : 'hover:bg-gray-50 dark:hover:bg-neutral-900/60'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-medium text-black dark:text-white text-sm truncate">{t.phone}</span>
                                                {t.hasUnhandled && (
                                                    <ExclamationTriangleIcon
                                                        className="w-3.5 h-3.5 text-amber-500"
                                                        aria-label="Message non traité"
                                                    />
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {formatTime(t.lastMessageAt)}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 truncate">
                                            {shortBody(t.lastMessageBody)}
                                        </p>
                                        <p className="mt-0.5 text-[10px] text-gray-400">
                                            {t.inboundCount} message{t.inboundCount > 1 ? 's' : ''} reçu{t.inboundCount > 1 ? 's' : ''}
                                        </p>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </aside>

                <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-neutral-950 overflow-hidden flex flex-col min-h-[60vh]">
                    {!activePhone ? (
                        <div className="flex-1 flex items-center justify-center p-8 text-sm text-gray-500 dark:text-gray-400">
                            Sélectionnez un fil pour voir la conversation.
                        </div>
                    ) : loadingThread ? (
                        <div className="p-6 space-y-3 flex-1">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-900 animate-pulse" />
                            ))}
                        </div>
                    ) : threadItems.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                            <ChatBubbleLeftRightIcon className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                            <p className="mt-3 text-sm font-medium text-black dark:text-white">Aucun message dans ce fil.</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-3 overflow-y-auto flex-1">
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                Fil avec <span className="font-medium text-black dark:text-white">{activePhone}</span>
                            </div>
                            {threadItems.map(item => {
                                const isOut = item.kind === 'out'
                                return (
                                    <div
                                        key={`${item.kind}-${item.id}`}
                                        className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                                                isOut
                                                    ? 'bg-black dark:bg-white text-white dark:text-black'
                                                    : 'bg-gray-100 dark:bg-neutral-900 text-black dark:text-white'
                                            }`}
                                        >
                                            <p className="whitespace-pre-line">{item.body || '—'}</p>
                                            <p className={`mt-1 text-[10px] ${isOut ? 'text-white/70 dark:text-black/70' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {formatTime(item.at)}
                                                {item.kind === 'in' && item.command_type && (
                                                    <> · cmd: {item.command_type}</>
                                                )}
                                                {item.kind === 'out' && (
                                                    <> · {item.event_type}{!item.success ? ' (échec)' : ''}</>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
