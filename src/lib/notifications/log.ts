import 'server-only'

import {createSupabaseServiceClient} from '@/lib/supabase/service'

export interface LogInput {
    channel: 'whatsapp' | 'email' | 'sms'
    /** Identifiant métier de l'évènement, ex: 'delivery.assigned', 'order.confirmed', 'couturier.reminder'. */
    event_type: string
    /** Téléphone E.164 ou email — selon le canal. */
    recipient: string
    subject?: string | null
    body: string
    related_order_id?: string | null
    related_delivery_id?: string | null
    success: boolean
    error?: string | null
}

/**
 * Insère une ligne dans `notifications_log`. Ne throw jamais — un échec de
 * logging ne doit pas faire planter l'envoi réel. On utilise le service
 * role parce que la table est admin-only en lecture (insert via bypass RLS).
 */
export async function logNotification(input: LogInput): Promise<void> {
    try {
        const supabase = createSupabaseServiceClient()
        const {error} = await supabase.from('notifications_log').insert({
            channel: input.channel,
            event_type: input.event_type,
            recipient: input.recipient,
            subject: input.subject ?? null,
            body: input.body,
            related_order_id: input.related_order_id ?? null,
            related_delivery_id: input.related_delivery_id ?? null,
            success: input.success,
            error: input.error ?? null,
        })
        if (error) {
            console.warn('[notifications_log] insert failed:', error.message)
        }
    } catch (err) {
        console.warn('[notifications_log] threw:', err instanceof Error ? err.message : err)
    }
}
