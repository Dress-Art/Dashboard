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

function parseCommand(text: string): {status: DeliveryStatus; token: string; signedByName?: string} | null {
    const cleaned = text.trim().replace(/\s+/g, ' ')
    const match = cleaned.match(
        /^(PICKUP|PICKED|RECUP|RECUPEREE|RECUPERER|TRANSIT|EN_ROUTE|DELIVERED|DELIVER|LIVREE|LIVRE|CANCEL|CANCELLED|ANNULEE|ANNULE)\s+([0-9a-fA-F-]{36})(?:\s+(.+))?$/i,
    )

    if (!match) return null

    const cmd = match[1].toUpperCase()
    const token = match[2]
    const signedByName = match[3]?.trim()

    if (['PICKUP', 'PICKED', 'RECUP', 'RECUPEREE', 'RECUPERER'].includes(cmd)) {
        return {status: 'picked_up', token}
    }
    if (['TRANSIT', 'EN_ROUTE'].includes(cmd)) {
        return {status: 'in_transit', token}
    }
    if (['DELIVERED', 'DELIVER', 'LIVREE', 'LIVRE'].includes(cmd)) {
        return {status: 'delivered', token, signedByName}
    }
    if (['CANCEL', 'CANCELLED', 'ANNULEE', 'ANNULE'].includes(cmd)) {
        return {status: 'cancelled', token}
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
