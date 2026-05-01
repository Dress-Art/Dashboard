/**
 * Source de vérité pour la table public.tissus.
 * Vocabulaire FR (cohérent avec le DDL).
 */

export interface Tissu {
    id: string
    nom: string
    texture: string | null
    couleur: string | null
    image_url: string | null
    prix_metre: number
    stock_disponible: boolean
    vendor_id: string | null
    created_at: string
    updated_at: string
}

export interface TissuInput {
    nom: string
    texture?: string | null
    couleur?: string | null
    image_url?: string | null
    prix_metre: number
    stock_disponible: boolean
    /** Auto-rempli côté frontend selon le rôle (vendeur → auth.uid()). */
    vendor_id?: string
}

export type TissuStockFilter = 'all' | 'available' | 'unavailable'
