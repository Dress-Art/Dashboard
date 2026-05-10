import 'server-only'

import {z} from 'zod'
import {TassiShipmentCreateInputSchema} from '@/lib/tassi/schemas'
import type {TassiShipmentCreateInput} from '@/lib/tassi/types'

/**
 * Erreur métier de construction du payload Tassi.
 * Codes (spec §6.4) :
 *   - ORDER_NOT_FOUND
 *   - CONFECTION_NOT_COMPLETED
 *   - MISSING_FIELDS  (details: { fields: string[] })
 */
export class ShipmentBuildError extends Error {
    constructor(
        public readonly code: string,
        public readonly details?: Record<string, unknown>,
    ) {
        super(code)
        this.name = 'ShipmentBuildError'
    }
}

/**
 * Forme normalisée des données nécessaires pour construire le shipment.
 * Le caller (route API) est responsable d'assembler ces objets depuis
 * notre schéma Supabase (auth.users + clients + orders).
 */
export interface OrderForBuild {
    id: string
    couturier_id: string
    agent_id: string | null
    couturier_confection_completed_at: string | null
}

export interface CouturierShop {
    name: string | null
    phone: string | null
    address_line1: string | null
    address_city: string | null
    address_zip: string | null
    /** ISO 3166-1 alpha-2, ex: 'BJ'. */
    address_country: string | null
}

export interface ClientDelivery {
    full_name: string | null
    phone: string | null
    address_line1: string | null
    address_city: string | null
    address_zip: string | null
    /** ISO 3166-1 alpha-2. */
    address_country: string | null
}

/**
 * Liste les champs manquants pour le one-click. Spec §6.4.
 * Les chemins retournés peuvent être affichés à l'utilisateur ("couturier.shop_name", etc.)
 */
export function collectMissingFields(
    couturier: CouturierShop,
    client: ClientDelivery,
): string[] {
    const missing: string[] = []

    // Profil couturier (origin)
    if (!couturier.name) missing.push('couturier.shop_name')
    if (!couturier.phone) missing.push('couturier.shop_phone')
    if (!couturier.address_line1) missing.push('couturier.shop_address_line1')
    if (!couturier.address_city) missing.push('couturier.shop_address_city')
    if (!couturier.address_country) missing.push('couturier.shop_address_country')

    // Profil client (destination)
    if (!client.full_name) missing.push('client.full_name')
    if (!client.phone) missing.push('client.phone')
    if (!client.address_line1) missing.push('client.delivery_address_line1')
    if (!client.address_city) missing.push('client.delivery_address_city')
    if (!client.address_country) missing.push('client.delivery_address_country')

    return missing
}

interface BuildOptions {
    /** Notes optionnelles pour le transporteur (spec §6.7), max 500 chars. */
    notes?: string
}

/**
 * Compose le payload `POST /v1/shipments` à partir des données déjà en base.
 * Spec §6.3.
 *
 * Lève `ShipmentBuildError` avec le code adéquat si pré-conditions non remplies.
 */
export function buildShipmentPayloadFromOrder(
    order: OrderForBuild,
    couturier: CouturierShop,
    client: ClientDelivery,
    options: BuildOptions = {},
): TassiShipmentCreateInput {
    if (!order.couturier_confection_completed_at) {
        throw new ShipmentBuildError('CONFECTION_NOT_COMPLETED')
    }

    const missing = collectMissingFields(couturier, client)
    if (missing.length > 0) {
        throw new ShipmentBuildError('MISSING_FIELDS', {fields: missing})
    }

    // Standards de colis Dress Art (spec §6.2). Lus depuis env, fallback constants.
    const weight = Number(process.env.DRESSART_PARCEL_DEFAULT_WEIGHT_KG ?? 1.0)
    const length = Number(process.env.DRESSART_PARCEL_DEFAULT_LENGTH_CM ?? 35)
    const width = Number(process.env.DRESSART_PARCEL_DEFAULT_WIDTH_CM ?? 25)
    const height = Number(process.env.DRESSART_PARCEL_DEFAULT_HEIGHT_CM ?? 10)
    const mode = (process.env.DRESSART_PARCEL_DEFAULT_MODE ?? 'pickup') as 'pickup' | 'dropoff'

    const payload: TassiShipmentCreateInput = {
        description: `Tenue Dress Art - Commande #${order.id}`,
        parcel: {
            description: `Tenue Dress Art - Commande #${order.id}`,
            weight,
            dimensions: {length, width, height, unit: 'cm'},
            content_type: 'textile',
            dangerous_goods: false,
            ...(options.notes ? {notes: options.notes} : {}),
        },
        origin: {
            name: couturier.name as string,
            phone: couturier.phone as string,
            address: {
                line1: couturier.address_line1 as string,
                city: couturier.address_city as string,
                zip: couturier.address_zip ?? '',
                country: couturier.address_country as string,
            },
        },
        destination: {
            name: client.full_name as string,
            phone: client.phone as string,
            address: {
                line1: client.address_line1 as string,
                city: client.address_city as string,
                zip: client.address_zip ?? '',
                country: client.address_country as string,
            },
        },
        mode,
        client_reference: order.id,
        metadata: {
            couturier_id: order.couturier_id,
            agent_id: order.agent_id ?? '',
            order_id: order.id,
        },
    }

    // Validation Zod interne — spec §3 mentionne `schemas.ts`
    try {
        return TassiShipmentCreateInputSchema.parse(payload)
    } catch (err) {
        if (err instanceof z.ZodError) {
            throw new ShipmentBuildError('PAYLOAD_INVALID', {
                issues: err.issues.map(i => ({path: i.path.join('.'), message: i.message})),
            })
        }
        throw err
    }
}
