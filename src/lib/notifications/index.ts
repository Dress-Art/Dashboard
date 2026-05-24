import 'server-only'

import {sendWhatsAppText, type SendResult} from '@/lib/evolution-api'
import {logNotification} from './log'

async function sendAndLog(args: {
    to: string
    text: string
    event_type: string
}): Promise<SendResult> {
    const result = await sendWhatsAppText(args.to, args.text)
    await logNotification({
        channel: 'whatsapp',
        event_type: args.event_type,
        recipient: args.to,
        body: args.text,
        success: result.success,
        error: result.skipped ?? result.error ?? null,
    })
    return result
}

/**
 * Templates WhatsApp transactionnels DressArt.
 *
 * Ancien design : passait par les Edge Functions Supabase `notify-couturier`
 * et `notify-client` — mais elles n'étaient pas déployées en prod, ce qui
 * cassait les server actions (ex. `remindCouturierAction`) en 500 puisque
 * `invokeFunction` levait une exception au lieu de renvoyer un résultat.
 *
 * Nouveau design : envoi direct via Evolution API (comme pour les livraisons),
 * fire-and-forget côté appelant. Chaque méthode renvoie `SendResult` (jamais
 * throw) pour que les server actions puissent continuer même si l'envoi
 * échoue (config absente, instance WhatsApp déconnectée, etc.).
 */

function fmtRef(orderId: string): string {
    return orderId.slice(0, 8).toUpperCase()
}

export const notify = {
    /**
     * Rappel WhatsApp envoyé au couturier qui traîne sur une commande.
     * Déclenché par l'admin depuis la modale détail commande.
     */
    couturierReminder: (
        couturierPhone: string,
        couturierName: string | null | undefined,
        orderNumber: string,
        modelName: string,
        statusLabel: string,
    ): Promise<SendResult> => {
        const greeting = couturierName ? `Bonjour ${couturierName},` : 'Bonjour,'
        const text = [
            `DressArt: rappel commande #${orderNumber}.`,
            `${greeting}`,
            `Modèle : ${modelName}`,
            `Statut actuel : ${statusLabel}`,
            'Merci de faire avancer cette commande dès que possible.',
        ].join('\n')
        return sendAndLog({to: couturierPhone, text, event_type: 'order.couturier_reminder'})
    },

    /** Confirmation envoyée au client juste après création de la commande. */
    orderConfirmed: (clientPhone: string, orderId: string, couturierName: string): Promise<SendResult> => {
        const text = [
            `DressArt: commande #${fmtRef(orderId)} confirmée.`,
            `Couturier attribué : ${couturierName}.`,
            'Nous vous tiendrons informé(e) à chaque étape.',
        ].join('\n')
        return sendAndLog({to: clientPhone, text, event_type: 'order.confirmed'})
    },

    /** Notification client après prise de RDV avec un agent (prise de mesures). */
    agentBooked: (
        clientPhone: string,
        orderId: string,
        appointmentDate: string,
        appointmentTime: string,
    ): Promise<SendResult> => {
        const text = [
            `DressArt: rendez-vous mesures confirmé pour la commande #${fmtRef(orderId)}.`,
            `Date : ${appointmentDate}`,
            `Heure : ${appointmentTime}`,
            'Un agent vous contactera juste avant le RDV.',
        ].join('\n')
        return sendAndLog({to: clientPhone, text, event_type: 'agent.appointment.booked'})
    },

    /** Notification client quand la couture démarre. */
    orderInProgress: (
        clientPhone: string,
        orderId: string,
        couturierName: string,
        estimatedDays: number,
    ): Promise<SendResult> => {
        const text = [
            `DressArt: votre commande #${fmtRef(orderId)} est en couture.`,
            `Couturier : ${couturierName}`,
            `Délai estimé : ${estimatedDays} jour(s).`,
        ].join('\n')
        return sendAndLog({to: clientPhone, text, event_type: 'order.in_progress'})
    },

    /** Notification client quand la commande est prête à livrer. */
    orderReady: (clientPhone: string, orderId: string, couturierName: string): Promise<SendResult> => {
        const text = [
            `DressArt: commande #${fmtRef(orderId)} prête.`,
            `Couturier : ${couturierName}.`,
            'Vous recevrez bientôt un lien de suivi de livraison.',
        ].join('\n')
        return sendAndLog({to: clientPhone, text, event_type: 'order.ready'})
    },

    /** Notification couturier d'une nouvelle commande qui lui est assignée. */
    newOrderToCouturier: (
        couturierPhone: string,
        orderId: string,
        clientName: string,
        modelName: string,
        measurementMethod: 'self' | 'agent',
    ): Promise<SendResult> => {
        const methodLabel = measurementMethod === 'agent' ? 'mesures via agent' : 'mesures auto-saisies par le client'
        const text = [
            `DressArt: nouvelle commande #${fmtRef(orderId)}.`,
            `Client : ${clientName}`,
            `Modèle : ${modelName}`,
            `Méthode : ${methodLabel}.`,
        ].join('\n')
        return sendAndLog({to: couturierPhone, text, event_type: 'order.new.couturier'})
    },

    /** Notification couturier quand le client a saisi ses mesures. */
    measuresReceived: (couturierPhone: string, orderId: string, clientName: string): Promise<SendResult> => {
        const text = [
            `DressArt: mesures reçues pour la commande #${fmtRef(orderId)}.`,
            `Client : ${clientName}`,
            'Vous pouvez démarrer la couture.',
        ].join('\n')
        return sendAndLog({to: couturierPhone, text, event_type: 'order.measures_received'})
    },

    /** Notification couturier quand l'agent a transmis les mesures. */
    agentMeasuresTransmitted: (couturierPhone: string, orderId: string, clientName: string): Promise<SendResult> => {
        const text = [
            `DressArt: mesures transmises par l'agent pour la commande #${fmtRef(orderId)}.`,
            `Client : ${clientName}`,
            'Vous pouvez démarrer la couture.',
        ].join('\n')
        return sendAndLog({to: couturierPhone, text, event_type: 'order.measures_transmitted'})
    },
}
