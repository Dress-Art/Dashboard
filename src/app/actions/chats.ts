'use server'

import {createSupabaseServerClient} from '@/lib/supabase/server'
import {createSupabaseServiceClient} from '@/lib/supabase/service'
import {getUserRole, isProfessionalRole} from '@/lib/roles'

export interface InboundMessage {
    id: string
    from_phone: string
    body: string | null
    media_url: string | null
    command_type: string | null
    handled_status: string | null
    received_at: string
}

export interface OutboundMessage {
    id: string
    recipient: string
    body: string
    event_type: string
    success: boolean
    error: string | null
    sent_at: string
}

export interface ChatThreadSummary {
    phone: string
    lastMessageBody: string | null
    lastMessageAt: string
    inboundCount: number
    /** Vrai si un message non encore traité (handled_status commence par 'ignored:'). */
    hasUnhandled: boolean
}

export async function listChatThreadsAction(): Promise<
    | {success: true; threads: ChatThreadSummary[]}
    | {success: false; error: string; threads: ChatThreadSummary[]}
> {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) return {success: false, error: 'unauthorized', threads: []}

    const role = getUserRole(user)
    if (!isProfessionalRole(role) || role !== 'admin') {
        return {success: false, error: 'forbidden', threads: []}
    }

    const supabase = createSupabaseServiceClient()
    const {data, error} = await supabase
        .from('whatsapp_inbound_messages')
        .select('id, from_phone, body, handled_status, received_at')
        .order('received_at', {ascending: false})
        .limit(1000)

    if (error) {
        return {success: false, error: error.message, threads: []}
    }

    const grouped = new Map<string, ChatThreadSummary>()
    for (const row of data ?? []) {
        const existing = grouped.get(row.from_phone)
        const unhandled = (row.handled_status ?? '').startsWith('ignored:')
        if (!existing) {
            grouped.set(row.from_phone, {
                phone: row.from_phone,
                lastMessageBody: row.body ?? null,
                lastMessageAt: row.received_at,
                inboundCount: 1,
                hasUnhandled: unhandled,
            })
        } else {
            existing.inboundCount += 1
            if (unhandled) existing.hasUnhandled = true
        }
    }

    return {
        success: true,
        threads: [...grouped.values()].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
    }
}

export async function getChatThreadAction(phone: string): Promise<
    | {success: true; inbound: InboundMessage[]; outbound: OutboundMessage[]}
    | {success: false; error: string; inbound: InboundMessage[]; outbound: OutboundMessage[]}
> {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) return {success: false, error: 'unauthorized', inbound: [], outbound: []}

    const role = getUserRole(user)
    if (!isProfessionalRole(role) || role !== 'admin') {
        return {success: false, error: 'forbidden', inbound: [], outbound: []}
    }

    const supabase = createSupabaseServiceClient()

    const [inboundRes, outboundRes] = await Promise.allSettled([
        supabase
            .from('whatsapp_inbound_messages')
            .select('id, from_phone, body, media_url, command_type, handled_status, received_at')
            .eq('from_phone', phone)
            .order('received_at', {ascending: true})
            .limit(500),
        supabase
            .from('notifications_log')
            .select('id, recipient, body, event_type, success, error, sent_at')
            .eq('channel', 'whatsapp')
            .eq('recipient', phone)
            .order('sent_at', {ascending: true})
            .limit(500),
    ])

    const inbound = inboundRes.status === 'fulfilled' && !inboundRes.value.error
        ? (inboundRes.value.data as InboundMessage[]) ?? []
        : []
    const outbound = outboundRes.status === 'fulfilled' && !outboundRes.value.error
        ? (outboundRes.value.data as OutboundMessage[]) ?? []
        : []

    return {success: true, inbound, outbound}
}
