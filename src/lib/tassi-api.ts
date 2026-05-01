/**
 * Client Tassi.pro — appels machine-to-machine côté serveur.
 *
 * Auth : `Authorization: Bearer <TASSI_API_KEY>` (clé `tassi_pub_mkp_*`).
 * La clé est lue depuis `process.env.TASSI_API_KEY` — JAMAIS exposée au client.
 *
 * Base URL : `process.env.TASSI_API_URL` (par défaut sandbox).
 *
 * Les méthodes lèvent `TassiApiError` en cas de !ok pour faciliter la gestion
 * d'erreur dans les server actions / Edge Functions DressArt.
 */

import type {
    TassiCarrier,
    TassiCreatePackageInput,
    TassiError,
    TassiList,
    TassiMarketplace,
    TassiOrder,
    TassiPackage,
    TassiPaginationMeta,
    TassiPickupPoint,
} from '@/types/tassi.types'

const DEFAULT_BASE_URL = 'https://sandbox-api.tassi.pro'

export class TassiApiError extends Error {
    constructor(
        public readonly status: number,
        public readonly body: TassiError | string,
        public readonly path: string,
    ) {
        const msg = typeof body === 'string' ? body : Array.isArray(body.message) ? body.message.join('; ') : body.message
        super(`Tassi ${status} ${path}: ${msg}`)
        this.name = 'TassiApiError'
    }
}

interface TassiClientOptions {
    baseUrl?: string
    apiKey?: string
}

class TassiClient {
    private readonly baseUrl: string
    private readonly apiKey: string

    constructor(opts: TassiClientOptions = {}) {
        this.baseUrl = (opts.baseUrl ?? process.env.TASSI_API_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '')
        this.apiKey = opts.apiKey ?? process.env.TASSI_API_KEY ?? ''
        if (!this.apiKey) {
            // On n'envoie pas d'erreur ici — un import côté frontend (qui n'a pas la clé) est OK
            // tant qu'on n'appelle pas réellement l'API. Les méthodes lèveront si manquante.
        }
    }

    private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
        if (!this.apiKey) {
            throw new TassiApiError(0, 'TASSI_API_KEY manquante côté serveur', path)
        }
        const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`
        const res = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Accept': 'application/json',
                ...(body !== undefined ? {'Content-Type': 'application/json'} : {}),
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
            cache: 'no-store',
        })

        const text = await res.text()
        let parsed: unknown = null
        try {
            parsed = text ? JSON.parse(text) : null
        } catch {
            parsed = text
        }

        if (!res.ok) {
            throw new TassiApiError(res.status, (parsed as TassiError) ?? text ?? 'Unknown error', path)
        }
        return parsed as T
    }

    // -------------------------------------------------------------------------
    // Marketplace identity
    // -------------------------------------------------------------------------

    /** Identité de la marketplace courante (basée sur la clé API utilisée). */
    async getMe(): Promise<{marketplace: TassiMarketplace}> {
        return this.request('GET', '/me')
    }

    // -------------------------------------------------------------------------
    // Pickup points
    // -------------------------------------------------------------------------

    async listPickupPoints(): Promise<TassiList<TassiPickupPoint, 'pickup_points'>> {
        return this.request('GET', '/pickup_points')
    }

    // -------------------------------------------------------------------------
    // Carriers
    // -------------------------------------------------------------------------

    async listCarriers(): Promise<TassiList<TassiCarrier, 'carriers'>> {
        return this.request('GET', '/carriers')
    }

    // -------------------------------------------------------------------------
    // Packages (= « shipments » dans l'UI Tassi)
    // -------------------------------------------------------------------------

    async listPackages(params: {page?: number; per_page?: number} = {}): Promise<{
        packages: TassiPackage[]
        meta: TassiPaginationMeta
    }> {
        const qs = new URLSearchParams()
        if (params.page) qs.set('page', String(params.page))
        if (params.per_page) qs.set('per_page', String(params.per_page))
        const tail = qs.toString() ? `?${qs}` : ''
        return this.request('GET', `/packages${tail}`)
    }

    async getPackage(id: number | string): Promise<{package: TassiPackage}> {
        return this.request('GET', `/packages/${id}`)
    }

    async createPackage(input: TassiCreatePackageInput): Promise<{package: TassiPackage}> {
        return this.request('POST', '/packages', input)
    }

    async cancelPackage(id: number | string, reason?: string): Promise<{package: TassiPackage}> {
        // Endpoint exact non encore confirmé — convention REST PATCH probable.
        // À ajuster si Tassi propose `/packages/:id/cancel`.
        return this.request('PATCH', `/packages/${id}`, {status: 'cancelled', cancellation_reason: reason})
    }

    // -------------------------------------------------------------------------
    // Orders (groupement de packages — utilisation à confirmer)
    // -------------------------------------------------------------------------

    async listOrders(params: {page?: number; per_page?: number} = {}): Promise<{
        orders: TassiOrder[]
        meta: TassiPaginationMeta
    }> {
        const qs = new URLSearchParams()
        if (params.page) qs.set('page', String(params.page))
        if (params.per_page) qs.set('per_page', String(params.per_page))
        const tail = qs.toString() ? `?${qs}` : ''
        return this.request('GET', `/orders${tail}`)
    }
}

/**
 * Singleton pour le serveur Next.js. À ne PAS importer dans un composant client.
 * Pour les tests, instancier directement `new TassiClient({apiKey, baseUrl})`.
 */
export const tassiAPI = new TassiClient()

export {TassiClient}
