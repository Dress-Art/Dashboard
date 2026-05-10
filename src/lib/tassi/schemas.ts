/**
 * Schémas Zod de validation interne pour l'intégration Tassi.
 * Utilisés AVANT l'envoi à Tassi pour catcher les payloads incomplets
 * (champs manquants en base, etc.) avec des erreurs métier claires.
 *
 * Référence : spec §3 (mention `schemas.ts`), §11 (modèles Tassi).
 */

import {z} from 'zod'

// ISO 3166-1 alpha-2 (2 lettres majuscules)
const CountryCode = z
    .string()
    .length(2, 'country must be ISO 3166-1 alpha-2 (2 letters)')
    .regex(/^[A-Z]{2}$/, 'country must be uppercase letters')

const Address = z.object({
    line1: z.string().min(1, 'line1 required'),
    city: z.string().min(1, 'city required'),
    zip: z.string(),
    country: CountryCode,
})

const Actor = z.object({
    name: z.string().min(1, 'name required'),
    phone: z.string().min(1, 'phone required'),
    address: Address,
})

const ParcelDimensions = z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
    unit: z.literal('cm'),
})

const Parcel = z.object({
    description: z.string().min(1).max(500),
    weight: z.number().positive(),
    dimensions: ParcelDimensions,
    value: z.number().nonnegative().optional(),
    currency: z.string().length(3).optional(),
    content_type: z.string().optional(),
    hs_code: z.string().optional(),
    dangerous_goods: z.boolean().optional(),
    notes: z.string().max(500).optional(),
})

export const TassiShipmentCreateInputSchema = z.object({
    description: z.string().min(1).max(500),
    parcel: Parcel,
    origin: Actor,
    destination: Actor,
    mode: z.enum(['pickup', 'dropoff']),
    client_reference: z.string().min(1),
    metadata: z.record(z.string(), z.string()).optional(),
    callback_url: z.string().url().optional(),
})

export type TassiShipmentCreateInputParsed = z.infer<typeof TassiShipmentCreateInputSchema>
