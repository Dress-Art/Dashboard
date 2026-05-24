/**
 * FedaPay — types et helpers PURS, importables côté client.
 *
 * Le module `@/lib/fedapay` (avec `server-only`) ne doit jamais traverser
 * jusqu'au navigateur ; ce fichier-ci sert de point d'entrée commun pour
 * les types et les utilitaires de formatage utilisés par la page Paiements
 * (Client Component) et par la route serveur `/api/payments`.
 */

export type FedaPayStatus =
    | 'pending'
    | 'approved'
    | 'declined'
    | 'canceled'
    | 'refunded'
    | 'transferred'
    | 'fraudulent'
    | 'link_pending'
    | 'link_paid'
    | 'link_failed'
    | 'link_canceled'
    | 'link_expired'

export interface FedaPayCustomer {
    id?: number
    firstname?: string | null
    lastname?: string | null
    email?: string | null
    phone_number?: {number: string | null; country?: string | null} | null
}

export interface FedaPayTransaction {
    id: number
    reference: string
    description: string | null
    amount: number
    currency?: {iso?: string; name?: string}
    mode: string | null
    status: FedaPayStatus
    created_at: string
    updated_at: string
    approved_at: string | null
    declined_at: string | null
    customer?: FedaPayCustomer | null
}

export interface ListResult {
    transactions: FedaPayTransaction[]
    /** Total reported by FedaPay across all pages. */
    total: number
    /** Pagination meta (current_page, last_page) when available. */
    meta?: {current_page?: number; last_page?: number; per_page?: number}
    /** Set when env not configured — UI peut afficher un message clair. */
    skipped?: string
}

export function formatCustomer(c?: FedaPayCustomer | null): string {
    if (!c) return 'Client'
    const name = [c.firstname, c.lastname].filter(Boolean).join(' ').trim()
    return name || c.email || c.phone_number?.number || 'Client'
}
