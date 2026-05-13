import 'server-only'

import {sendWhatsAppText} from '@/lib/evolution-api'
import {buildTrackingUrl, type DeliveryRow} from '@/lib/deliveries-api'
import {DELIVERY_STATUS_LABELS_FR, type DeliveryStatus} from '@/types/delivery.types'

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

async function fireAndForget(to: string | null, text: string) {
    if (!to) return
    const result = await sendWhatsAppText(to, text)
    if (!result.success && !result.skipped) {
        console.error('[deliveries notifications] WhatsApp failed:', result.error)
    }
}

export async function notifyDeliveryAssigned(input: NotifyAssignInput) {
    await Promise.all([
        fireAndForget(input.driverPhone ?? null, buildDriverAssignmentMessage(input.delivery, input.driverName)),
        fireAndForget(adminPhone(), buildAdminMessage(input.delivery, 'livraison assignée')),
    ])
}

export async function notifyDeliveryStatusChanged(input: NotifyStatusInput) {
    const shouldNotifyCustomer = input.status === 'in_transit' || input.status === 'delivered'
    await Promise.all([
        shouldNotifyCustomer
            ? fireAndForget(input.delivery.customer_phone, buildCustomerMessage(input.delivery, input.status))
            : Promise.resolve(),
        fireAndForget(adminPhone(), buildAdminMessage(input.delivery, `livraison -> ${DELIVERY_STATUS_LABELS_FR[input.status]}`)),
    ])
}
