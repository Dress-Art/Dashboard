import 'server-only'

import {sendEmail, type EmailSendResult} from '@/lib/resend'

/**
 * Templates email transactionnels DressArt.
 *
 * Tous les helpers délèguent à `sendEmail` qui se charge :
 *   - de l'auth Resend,
 *   - du dégrade gracieux quand l'env n'est pas configuré,
 *   - de l'écriture dans `notifications_log`.
 *
 * Aucun trigger n'est plombé automatiquement pour l'instant — appelez ces
 * fonctions depuis vos server actions au moment opportun.
 */

function fmtRef(orderId: string): string {
    return orderId.slice(0, 8).toUpperCase()
}

interface BaseInput {
    clientEmail: string
    orderId: string
    customerName?: string | null
}

function wrapHtml(title: string, lines: string[]): string {
    const body = lines.map(l => `<p style="margin:0 0 12px 0;">${l}</p>`).join('')
    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 24px auto; color: #111;">
  <h1 style="font-size: 18px; margin: 0 0 16px 0;">${title}</h1>
  ${body}
  <p style="margin-top: 24px; font-size: 12px; color: #666;">DressArt — couture sur mesure.</p>
</body>
</html>`
}

export const notifyEmail = {
    /** Confirmation de commande envoyée au client juste après création. */
    orderConfirmed: async (input: BaseInput & {couturierName?: string | null}): Promise<EmailSendResult> => {
        const ref = fmtRef(input.orderId)
        const greeting = input.customerName ? `Bonjour ${input.customerName},` : 'Bonjour,'
        const lines = [
            greeting,
            `Votre commande <strong>#${ref}</strong> est confirmée.`,
            input.couturierName ? `Couturier attribué : ${input.couturierName}.` : null,
            'Nous vous tiendrons informé(e) à chaque étape par WhatsApp et email.',
        ].filter(Boolean) as string[]
        return sendEmail({
            to: input.clientEmail,
            subject: `DressArt — commande #${ref} confirmée`,
            html: wrapHtml('Commande confirmée', lines),
            event_type: 'email.order.confirmed',
            related_order_id: input.orderId,
        })
    },

    /** Reçu paiement envoyé après transition vers paid / acompte. */
    paymentReceipt: async (input: BaseInput & {amount: number; currency?: string}): Promise<EmailSendResult> => {
        const ref = fmtRef(input.orderId)
        const currency = input.currency ?? 'FCFA'
        const amount = input.amount.toLocaleString('fr-FR')
        const lines = [
            input.customerName ? `Bonjour ${input.customerName},` : 'Bonjour,',
            `Nous avons bien reçu votre paiement de <strong>${amount} ${currency}</strong> pour la commande <strong>#${ref}</strong>.`,
            'Conservez cet email comme reçu.',
        ]
        return sendEmail({
            to: input.clientEmail,
            subject: `DressArt — reçu paiement commande #${ref}`,
            html: wrapHtml('Reçu de paiement', lines),
            event_type: 'email.payment.receipt',
            related_order_id: input.orderId,
        })
    },

    /** Notification « commande livrée » avec lien de tracking. */
    orderDelivered: async (input: BaseInput & {trackingUrl?: string | null}): Promise<EmailSendResult> => {
        const ref = fmtRef(input.orderId)
        const lines = [
            input.customerName ? `Bonjour ${input.customerName},` : 'Bonjour,',
            `Votre commande <strong>#${ref}</strong> a été livrée.`,
            input.trackingUrl
                ? `Vous pouvez confirmer la réception ici : <a href="${input.trackingUrl}">${input.trackingUrl}</a>.`
                : null,
            'Merci pour votre confiance.',
        ].filter(Boolean) as string[]
        return sendEmail({
            to: input.clientEmail,
            subject: `DressArt — commande #${ref} livrée`,
            html: wrapHtml('Commande livrée', lines),
            event_type: 'email.order.delivered',
            related_order_id: input.orderId,
        })
    },
}
