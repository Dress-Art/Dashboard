'use server'

import {createSupabaseServerClient} from '@/lib/supabase/server'
import {createSupabaseServiceClient} from '@/lib/supabase/service'
import {getUserRole, isProfessionalRole} from '@/lib/roles'

export interface NotificationRow {
    id: string
    channel: 'whatsapp' | 'email' | 'sms'
    event_type: string
    recipient: string
    subject: string | null
    body: string
    related_order_id: string | null
    related_delivery_id: string | null
    success: boolean
    error: string | null
    sent_at: string
}

export async function listNotificationsAction(params: {
    channel?: 'whatsapp' | 'email' | 'sms' | 'all'
    success?: boolean | 'all'
    limit?: number
} = {}): Promise<
    | {success: true; notifications: NotificationRow[]; total: number}
    | {success: false; error: string; notifications: NotificationRow[]; total: number}
> {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) return {success: false, error: 'unauthorized', notifications: [], total: 0}

    const role = getUserRole(user)
    if (!isProfessionalRole(role) || role !== 'admin') {
        return {success: false, error: 'forbidden', notifications: [], total: 0}
    }

    const supabase = createSupabaseServiceClient()
    let query = supabase
        .from('notifications_log')
        .select('*', {count: 'exact'})
        .order('sent_at', {ascending: false})
        .limit(params.limit ?? 200)

    if (params.channel && params.channel !== 'all') {
        query = query.eq('channel', params.channel)
    }
    if (typeof params.success === 'boolean') {
        query = query.eq('success', params.success)
    }

    const {data, count, error} = await query
    if (error) {
        return {success: false, error: error.message, notifications: [], total: 0}
    }

    return {success: true, notifications: (data ?? []) as NotificationRow[], total: count ?? 0}
}
