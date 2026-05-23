import 'server-only'

/**
 * FedaPay — client HTTP server-only.
 *
 * Aucun secret n'est exposé au client : le dashboard utilise ce module
 * depuis des route handlers (`/api/payments/*`) ou des server actions
 * uniquement. La clé `FEDAPAY_API_KEY` doit rester côté serveur.
 *
 * Env requises :
 *   - FEDAPAY_API_KEY        (clé secrète, sk_live_… ou sk_sandbox_…)
 *   - FEDAPAY_ENVIRONMENT    'live' | 'sandbox' (défaut 'sandbox' si absent)
 */

const FEDAPAY_BASE_URLS = {
    live: 'https://api.fedapay.com',
    sandbox: 'https://sandbox-api.fedapay.com',
} as const

type FedaPayEnv = keyof typeof FEDAPAY_BASE_URLS

function getConfig(): {baseUrl: string; apiKey: string} | null {
    const apiKey = process.env.FEDAPAY_API_KEY
    if (!apiKey) return null
    const env = ((process.env.FEDAPAY_ENVIRONMENT ?? 'sandbox').toLowerCase() as FedaPayEnv)
    const baseUrl = FEDAPAY_BASE_URLS[env] ?? FEDAPAY_BASE_URLS.sandbox
    return {baseUrl, apiKey}
}

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

interface ListParams {
    /** 1-indexed page, FedaPay default 1. */
    page?: number
    /** Default 25, max 100. */
    perPage?: number
    /** Filter on status. */
    status?: FedaPayStatus
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

interface FedaPayListResponse {
    'v1/transactions'?: FedaPayTransaction[]
    transactions?: FedaPayTransaction[]
    meta?: {
        current_page?: number
        next_page?: number | null
        prev_page?: number | null
        per_page?: number
        total?: number
        last_page?: number
    }
}

export async function listTransactions(params: ListParams = {}): Promise<ListResult> {
    const config = getConfig()
    if (!config) {
        return {transactions: [], total: 0, skipped: 'fedapay_not_configured'}
    }

    const query = new URLSearchParams()
    query.set('per_page', String(params.perPage ?? 25))
    if (params.page) query.set('page', String(params.page))
    if (params.status) query.set('status', params.status)

    const url = `${config.baseUrl}/v1/transactions?${query.toString()}`
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
        },
        // Pas de cache : on veut les transactions à jour.
        cache: 'no-store',
    })

    if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`fedapay_${res.status}: ${body.slice(0, 240)}`)
    }

    const json = (await res.json()) as FedaPayListResponse
    // FedaPay renvoie les transactions sous la clé `v1/transactions` ou
    // `transactions` selon la version — on tolère les deux.
    const transactions = json['v1/transactions'] ?? json.transactions ?? []
    return {
        transactions,
        total: json.meta?.total ?? transactions.length,
        meta: json.meta,
    }
}

export function formatCustomer(c?: FedaPayCustomer | null): string {
    if (!c) return 'Client'
    const name = [c.firstname, c.lastname].filter(Boolean).join(' ').trim()
    return name || c.email || c.phone_number?.number || 'Client'
}
