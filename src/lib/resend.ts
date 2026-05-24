import 'server-only'

import {logNotification} from '@/lib/notifications/log'

/**
 * Resend — client HTTP server-only pour les emails transactionnels.
 *
 * Env requises :
 *   - RESEND_API_KEY  (re_…)
 *   - RESEND_FROM     (ex: "DressArt <hello@dressart.studio>")
 *
 * À n'importer QUE depuis server actions / route handlers. La clé API
 * ne doit jamais traverser jusqu'au navigateur.
 */

export interface EmailSendResult {
    success: boolean
    error?: string
    /** Reason si l'envoi a été sauté (env absent, destinataire vide). */
    skipped?: string
    /** ID Resend de l'email si l'envoi a réussi. */
    id?: string
}

function getConfig(): {apiKey: string; from: string} | null {
    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.RESEND_FROM
    if (!apiKey || !from) return null
    return {apiKey, from}
}

interface SendEmailInput {
    to: string | string[]
    subject: string
    html: string
    text?: string
    /** Identifiant métier — passé au logger pour audit. */
    event_type?: string
    related_order_id?: string | null
    related_delivery_id?: string | null
}

/**
 * Envoie un email via Resend et enregistre l'opération dans
 * `notifications_log`. Ne throw jamais — retourne un EmailSendResult.
 */
export async function sendEmail(input: SendEmailInput): Promise<EmailSendResult> {
    const config = getConfig()
    const recipients = Array.isArray(input.to) ? input.to : [input.to]
    const recipientForLog = recipients.join(', ')

    if (!config) {
        const result: EmailSendResult = {success: false, skipped: 'resend_not_configured'}
        await logNotification({
            channel: 'email',
            event_type: input.event_type ?? 'email.send',
            recipient: recipientForLog,
            subject: input.subject,
            body: input.text ?? input.html,
            related_order_id: input.related_order_id ?? null,
            related_delivery_id: input.related_delivery_id ?? null,
            success: false,
            error: result.skipped,
        })
        return result
    }

    if (recipients.length === 0) {
        const result: EmailSendResult = {success: false, skipped: 'missing_recipient'}
        return result
    }

    let result: EmailSendResult
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                from: config.from,
                to: recipients,
                subject: input.subject,
                html: input.html,
                ...(input.text ? {text: input.text} : {}),
            }),
        })

        if (!res.ok) {
            const body = await res.text().catch(() => '')
            result = {success: false, error: `resend_${res.status}: ${body.slice(0, 200)}`}
        } else {
            const body = (await res.json().catch(() => ({}))) as {id?: string}
            result = {success: true, id: body.id}
        }
    } catch (err) {
        result = {success: false, error: err instanceof Error ? err.message : 'unknown_error'}
    }

    await logNotification({
        channel: 'email',
        event_type: input.event_type ?? 'email.send',
        recipient: recipientForLog,
        subject: input.subject,
        body: input.text ?? input.html,
        related_order_id: input.related_order_id ?? null,
        related_delivery_id: input.related_delivery_id ?? null,
        success: result.success,
        error: result.skipped ?? result.error ?? null,
    })

    return result
}
