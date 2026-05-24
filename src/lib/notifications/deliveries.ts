import 'server-only'

import {sendWhatsAppText} from '@/lib/evolution-api'
import {buildTrackingUrl, type DeliveryRow} from '@/lib/deliveries-api'
import {DELIVERY_STATUS_LABELS_FR, type DeliveryStatus} from '@/types/delivery.types'
import {logNotification} from './log'

interface NotifyAssignInput {
    delivery: DeliveryRow
    driverPhone?: string | null
    driverName?: string | null
}

interface NotifyStatusInput {
    delivery: DeliveryRow
    status: DeliveryStatus
}

function adminPhone(): string | null {
    return process.env.ADMIN_WHATSAPP_PHONE?.trim() || null
}

function formatDeliveryRef(delivery: DeliveryRow): string {
    return delivery.order_id.slice(0, 8).toUpperCase()
}

function buildCustomerMessage(delivery: DeliveryRow, status: DeliveryStatus): string {
    const ref = formatDeliveryRef(delivery)
    const trackingUrl = buildTrackingUrl(delivery.tracking_token)

    if (status === 'in_transit') {
        return [
            `DressArt: votre livraison #${ref} est en route.`,
            `Suivi client: ${trackingUrl}`,
        ].join('\n')
    }

    if (status === 'delivered') {
        return [
            `DressArt: votre livraison #${ref} est marquée livrée.`,
            `Merci de confirmer la réception si besoin : ${trackingUrl}`,
        ].join('\n')
    }

    return `DressArt: mise à jour livraison #${ref} -> ${DELIVERY_STATUS_LABELS_FR[status]}`
}

function buildDriverAssignmentMessage(delivery: DeliveryRow, driverName?: string | null): string {
    const ref = formatDeliveryRef(delivery)
    const trackingUrl = buildTrackingUrl(delivery.tracking_token)

    return [
        `DressArt: nouvelle livraison assignée #${ref}.`,
        driverName ? `Livreur: ${driverName}` : null,
        `Client: ${delivery.customer_name}`,
        delivery.customer_phone ? `Téléphone client: ${delivery.customer_phone}` : null,
        `Adresse: ${delivery.customer_address}`,
        `Tracking: ${trackingUrl}`,
        `Statut: ${DELIVERY_STATUS_LABELS_FR[delivery.status]}`,
        'Actions WhatsApp rapides :',
        `PICKUP ${delivery.tracking_token}`,
        `TRANSIT ${delivery.tracking_token}`,
        `DELIVERED ${delivery.tracking_token} NomReception`,
    ]
        .filter(Boolean)
        .join('\n')
}

function buildAdminMessage(delivery: DeliveryRow, label: string): string {
    return [
        `DressArt admin: ${label} #${formatDeliveryRef(delivery)}.`,
        `Client: ${delivery.customer_name}`,
        delivery.driver_id ? `Livreur ID: ${delivery.driver_id}` : 'Livreur non assigné',
        `Statut: ${DELIVERY_STATUS_LABELS_FR[delivery.status]}`,
    ].join('\n')
}

async function sendAndLog(args: {
    to: string | null
    text: string
    event_type: string
    delivery: DeliveryRow
}): Promise<void> {
    if (!args.to) return
    const result = await sendWhatsAppText(args.to, args.text)
    if (!result.success && !result.skipped) {
        console.error('[deliveries notifications] WhatsApp failed:', result.error)
    }
    await logNotification({
        channel: 'whatsapp',
        event_type: args.event_type,
        recipient: args.to,
        body: args.text,
        related_order_id: args.delivery.order_id,
        related_delivery_id: args.delivery.id,
        success: result.success,
        error: result.skipped ?? result.error ?? null,
    })
}

export async function notifyDeliveryAssigned(input: NotifyAssignInput) {
    await Promise.all([
        sendAndLog({
            to: input.driverPhone ?? null,
            text: buildDriverAssignmentMessage(input.delivery, input.driverName),
            event_type: 'delivery.assigned.driver',
            delivery: input.delivery,
        }),
        sendAndLog({
            to: adminPhone(),
            text: buildAdminMessage(input.delivery, 'livraison assignée'),
            event_type: 'delivery.assigned.admin',
            delivery: input.delivery,
        }),
    ])
}

export async function notifyDeliveryStatusChanged(input: NotifyStatusInput) {
    const shouldNotifyCustomer = input.status === 'in_transit' || input.status === 'delivered'
    await Promise.all([
        shouldNotifyCustomer
            ? sendAndLog({
                  to: input.delivery.customer_phone,
                  text: buildCustomerMessage(input.delivery, input.status),
                  event_type: `delivery.${input.status}.customer`,
                  delivery: input.delivery,
              })
            : Promise.resolve(),
        sendAndLog({
            to: adminPhone(),
            text: buildAdminMessage(input.delivery, `livraison -> ${DELIVERY_STATUS_LABELS_FR[input.status]}`),
            event_type: `delivery.${input.status}.admin`,
            delivery: input.delivery,
        }),
    ])
}
