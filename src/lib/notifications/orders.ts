import 'server-only'

import {sendWhatsAppText} from '@/lib/evolution-api'

interface OrderReminderInput {
    couturierPhone: string
    couturierName?: string | null
    orderNumber: string
    modelName: string
    statusLabel: string
}

export async function notifyCouturierReminder(input: OrderReminderInput) {
    const message = [
        `DressArt: rappel pour la commande ${input.orderNumber}.`,
        input.couturierName ? `Bonjour ${input.couturierName},` : null,
        `Modèle: ${input.modelName}`,
        `Statut actuel: ${input.statusLabel}`,
        'Merci de faire le point sur l’avancement.',
    ]
        .filter(Boolean)
        .join('\n')

    const result = await sendWhatsAppText(input.couturierPhone, message)
    if (!result.success && !result.skipped) {
        console.error('[notifyCouturierReminder] WhatsApp failed:', result.error)
    }

    return result
}
