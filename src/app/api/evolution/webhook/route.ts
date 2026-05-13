import {NextRequest, NextResponse} from 'next/server'
import {createSupabaseServiceClient} from '@/lib/supabase/service'
import {sendWhatsAppText, normalizePhoneForEvolution} from '@/lib/evolution-api'
import {notifyDeliveryStatusChanged} from '@/lib/notifications/deliveries'
import type {DeliveryStatus} from '@/types/delivery.types'
import {DELIVERY_NEXT_STATUS} from '@/types/delivery.types'

type DeliveryRow = {
    id: string
    tracking_token: string
    status: DeliveryStatus
    driver_id: string | null
    customer_name: string
    customer_phone: string | null
    customer_address: string
    order_id: string
    priority: 'low' | 'normal' | 'high' | 'urgent'
    estimated_time: string | null
    actual_delivery_time: string | null
    notes: string | null
    tracking_info: Record<string, unknown> | null
    proof_url: string | null
    signed_at: string | null
    signed_by_name: string | null
    assigned_at: string | null
    created_at: string
    updated_at: string
}

function isAuthorizedWebhook(request: NextRequest): boolean {
    const expected = process.env.EVOLUTION_WEBHOOK_SECRET
    if (!expected) return true

    const given =
        request.headers.get('x-evolution-secret') ||
        request.headers.get('x-webhook-secret') ||
        request.nextUrl.searchParams.get('secret')

    return given === expected
}

function extractText(payload: any): string {
    return (
        payload?.data?.message?.conversation ||
        payload?.data?.message?.extendedTextMessage?.text ||
        payload?.body?.text ||
        payload?.text ||
        ''
    )
}

function extractSender(payload: any): string | null {
    const raw =
        payload?.data?.key?.remoteJid ||
        payload?.sender ||
        payload?.from ||
        payload?.phone ||
        null
    if (!raw || typeof raw !== 'string') return null
    return normalizePhoneForEvolution(raw.replace(/@.*/, ''))
}

function extractMediaUrl(payload: any): string | null {
    return (
        payload?.data?.message?.imageMessage?.url ||
        payload?.data?.message?.documentMessage?.url ||
        payload?.data?.message?.videoMessage?.url ||
        payload?.media?.url ||
        null
    )
}

function isFromMe(payload: any): boolean {
    return Boolean(payload?.data?.key?.fromMe || payload?.fromMe)
}

function parseCommand(text: string): {type: 'delivery_status'; status: DeliveryStatus; token: string; signedByName?: string} | {type: 'claim_order'; orderNumber: string} | null {
    const cleaned = text.trim().replace(/\s+/g, ' ')
    
    // Parse CLAIM <order_number> command
    const claimMatch = cleaned.match(/^CLAIM\s+([0-9A-Z#-]+)$/i)
    if (claimMatch) {
        return {type: 'claim_order', orderNumber: claimMatch[1]}
    }
    
    // Parse delivery status command
    const statusMatch = cleaned.match(
        /^(PICKUP|PICKED|RECUP|RECUPEREE|RECUPERER|TRANSIT|EN_ROUTE|DELIVERED|DELIVER|LIVREE|LIVRE|CANCEL|CANCELLED|ANNULEE|ANNULE)\s+([0-9a-fA-F-]{36})(?:\s+(.+))?$/i,
    )

    if (!statusMatch) return null

    const cmd = statusMatch[1].toUpperCase()
    const token = statusMatch[2]
    const signedByName = statusMatch[3]?.trim()

    if (['PICKUP', 'PICKED', 'RECUP', 'RECUPEREE', 'RECUPERER'].includes(cmd)) {
        return {type: 'delivery_status', status: 'picked_up', token}
    }
    if (['TRANSIT', 'EN_ROUTE'].includes(cmd)) {
        return {type: 'delivery_status', status: 'in_transit', token}
    }
    if (['DELIVERED', 'DELIVER', 'LIVREE', 'LIVRE'].includes(cmd)) {
        return {type: 'delivery_status', status: 'delivered', token, signedByName}
    }
    if (['CANCEL', 'CANCELLED', 'ANNULEE', 'ANNULE'].includes(cmd)) {
        return {type: 'delivery_status', status: 'cancelled', token}
    }
    return null
}

function canTransition(current: DeliveryStatus, target: DeliveryStatus): boolean {
    if (target === 'cancelled') {
        return current !== 'delivered' && current !== 'cancelled'
    }
    return DELIVERY_NEXT_STATUS[current] === target
}

async function resolveDriverPhone(delivery: DeliveryRow): Promise<string | null> {
    if (!delivery.driver_id) return null
    const supabase = createSupabaseServiceClient()
    const {data, error} = await supabase.auth.admin.getUserById(delivery.driver_id)
    if (error || !data.user?.phone) return null
    return normalizePhoneForEvolution(data.user.phone)
}

async function handleClaimOrder(orderNumber: string, senderPhone: string): Promise<NextResponse> {
    const supabase = createSupabaseServiceClient()

    // Retrieve order by orderNumber
    const {data: orderData, error: orderError} = await supabase
        .from('orders')
        .select('id, model_id, professional_id')
        .eq('orderNumber', orderNumber)
        .maybeSingle()

    if (orderError || !orderData) {
        await sendWhatsAppText(senderPhone, `DressArt: Commande #${orderNumber} introuvable.`)
        return NextResponse.json({ok: true, ignored: 'order_not_found'})
    }

    // Retrieve couturier user from auth.users by phone
    const {data: authData, error: authError} = await supabase.auth.admin.listUsers()
    if (authError || !authData.users) {
        await sendWhatsAppText(senderPhone, 'DressArt: Erreur lors de la vérification identité.')
        return NextResponse.json({ok: true, ignored: 'auth_list_failed'})
    }

    const couturierUser = authData.users.find(
        u => u.phone && normalizePhoneForEvolution(u.phone) === senderPhone
    )
    if (!couturierUser) {
        await sendWhatsAppText(senderPhone, 'DressArt: Profil couturier introuvable.')
        return NextResponse.json({ok: true, ignored: 'couturier_not_found'})
    }

    // Verify that the couturier's model matches the order's model_id
    if (orderData.model_id) {
        const {data: modelData, error: modelError} = await supabase
            .from('modeles')
            .select('professional_id')
            .eq('id', orderData.model_id)
            .maybeSingle()

        if (!modelError && modelData?.professional_id !== couturierUser.id) {
            await sendWhatsAppText(senderPhone, 'DressArt: Ce modèle ne vous appartient pas.')
            return NextResponse.json({ok: true, ignored: 'couturier_not_owner'})
        }
    }

    // Check if already assigned to another couturier
    if (orderData.professional_id && orderData.professional_id !== couturierUser.id) {
        await sendWhatsAppText(
            senderPhone,
            `DressArt: Commande #${orderNumber} est déjà assignée à un autre couturier.`,
        )
        return NextResponse.json({ok: true, ignored: 'order_already_assigned'})
    }

    // Assign order to couturier
    const {data: updated, error: updateError} = await supabase
        .from('orders')
        .update({professional_id: couturierUser.id})
        .eq('id', orderData.id)
        .select('*')
        .single()

    if (updateError || !updated) {
        await sendWhatsAppText(senderPhone, 'DressArt: Erreur lors de l\'assignation.')
        return NextResponse.json({ok: true, ignored: 'update_failed'})
    }

    await sendWhatsAppText(
        senderPhone,
        `DressArt: ✅ Commande #${orderNumber} acceptée! Merci de démarrer les préparatifs.`,
    )
    return NextResponse.json({ok: true})
}

async function handleDeliveryStatusUpdate(
    command: {type: 'delivery_status'; status: DeliveryStatus; token: string; signedByName?: string},
    sender: string,
    payload: any,
): Promise<NextResponse> {
    const supabase = createSupabaseServiceClient()
    const {data, error} = await supabase
        .from('deliveries')
        .select('*')
        .eq('tracking_token', command.token)
        .maybeSingle()

    if (error || !data) {
        await sendWhatsAppText(sender, 'DressArt: livraison introuvable pour ce token.')
        return NextResponse.json({ok: true, ignored: 'delivery_not_found'})
    }

    const delivery = data as DeliveryRow
    const driverPhone = await resolveDriverPhone(delivery)
    if (!driverPhone || driverPhone !== sender) {
        await sendWhatsAppText(sender, 'DressArt: vous n\'êtes pas autorisé sur cette livraison.')
        return NextResponse.json({ok: true, ignored: 'sender_not_authorized'})
    }

    if (!canTransition(delivery.status, command.status)) {
        await sendWhatsAppText(
            sender,
            `DressArt: transition invalide (${delivery.status} -> ${command.status}).`,
        )
        return NextResponse.json({ok: true, ignored: 'invalid_transition'})
    }

    const patch: Record<string, unknown> = {status: command.status}
    if (command.status === 'delivered') {
        patch.actual_delivery_time = new Date().toISOString()
        patch.signed_at = new Date().toISOString()
        if (command.signedByName) patch.signed_by_name = command.signedByName
        const mediaUrl = extractMediaUrl(payload)
        if (mediaUrl) patch.proof_url = mediaUrl
    }

    const {data: updated, error: updateError} = await supabase
        .from('deliveries')
        .update(patch)
        .eq('id', delivery.id)
        .select('*')
        .single()

    if (updateError || !updated) {
        await sendWhatsAppText(sender, 'DressArt: échec de mise à jour livraison.')
        return NextResponse.json({ok: true, ignored: 'db_update_failed'})
    }

    const updatedDelivery = updated as DeliveryRow
    void notifyDeliveryStatusChanged({delivery: updatedDelivery, status: command.status})
    await sendWhatsAppText(sender, `DressArt: statut mis à jour -> ${command.status}.`)

    return NextResponse.json({ok: true})
}

export async function POST(request: NextRequest) {
    if (!isAuthorizedWebhook(request)) {
        return NextResponse.json({ok: false, error: 'unauthorized_webhook'}, {status: 401})
    }

    const payload = await request.json().catch(() => ({}))

    if (isFromMe(payload)) {
        return NextResponse.json({ok: true, ignored: 'from_me'})
    }

    const text = extractText(payload)
    const sender = extractSender(payload)
    const command = parseCommand(text)

    if (!sender || !command) {
        return NextResponse.json({ok: true, ignored: 'unrecognized_payload'})
    }

    // Handle claim order command
    if (command.type === 'claim_order') {
        return handleClaimOrder(command.orderNumber, sender)
    }

    // Handle delivery status command
    return handleDeliveryStatusUpdate(command, sender, payload)
}

