import 'server-only'

import type {FedaPayStatus, FedaPayTransaction, ListResult} from './fedapay-types'

/**
 * FedaPay — client HTTP server-only.
 *
 * Les types et helpers de formatage sont dans `./fedapay-types` (client-safe).
 * Ce fichier expose uniquement le runtime serveur qui consomme la clé secrète.
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
    const env = (process.env.FEDAPAY_ENVIRONMENT ?? 'sandbox').toLowerCase() as FedaPayEnv
    const baseUrl = FEDAPAY_BASE_URLS[env] ?? FEDAPAY_BASE_URLS.sandbox
    return {baseUrl, apiKey}
}

interface ListParams {
    /** 1-indexed page, FedaPay default 1. */
    page?: number
    /** Default 25, max 100. */
    perPage?: number
    /** Filter on status. */
    status?: FedaPayStatus
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
        cache: 'no-store',
    })

    if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`fedapay_${res.status}: ${body.slice(0, 240)}`)
    }

    const json = (await res.json()) as FedaPayListResponse
    const transactions = json['v1/transactions'] ?? json.transactions ?? []
    return {
        transactions,
        total: json.meta?.total ?? transactions.length,
        meta: json.meta,
    }
}
