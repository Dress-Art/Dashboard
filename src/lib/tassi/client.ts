import 'server-only'

import {TassiApiError} from './errors'
import type {
    TassiLabelResponse,
    TassiResponse,
    TassiShipment,
    TassiShipmentCreateInput,
} from './types'

/**
 * Client HTTP Tassi.pro — server-only.
 * Référence : spec §10 (auth), §11 (modèles), §16 (hypothèses).
 *
 * Variables d'env requises (spec §2.2) :
 *   - TASSI_SECRET_KEY  : `sk_sandbox_*` ou `sk_live_*` (bearer)
 *   - TASSI_BASE_URL    : `https://sandbox-api.tassi.com/v1` ou `https://api.tassi.com/v1`
 *
 * Les calls passent TOUS par `request()` qui :
 *   1. Ajoute `Authorization: Bearer ...`, `Content-Type: application/json`
 *   2. Propage `Idempotency-Key` si fourni en options
 *   3. Lève `TassiApiError` typée sur !res.ok (avec le request_id du body)
 */

interface RequestOptions {
    body?: unknown
    /** UUID v4 — obligatoire sur les créations (spec §10.2). */
    idempotencyKey?: string
    /** Headers additionnels éventuels. */
    headers?: Record<string, string>
    /** Override du base URL (utile pour les tests). */
    baseUrl?: string
}

class TassiClient {
    private getBaseUrl(override?: string): string {
        const url = override ?? process.env.TASSI_BASE_URL
        if (!url) {
            throw new TassiApiError(0, 'TASSI_BASE_URL non configurée', '/')
        }
        return url.replace(/\/$/, '')
    }

    private getSecret(): string {
        const key = process.env.TASSI_SECRET_KEY
        if (!key) {
            throw new TassiApiError(0, 'TASSI_SECRET_KEY non configurée', '/')
        }
        return key
    }

    private async request<T>(
        method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
        path: string,
        opts: RequestOptions = {},
    ): Promise<T> {
        const url = `${this.getBaseUrl(opts.baseUrl)}${path.startsWith('/') ? path : `/${path}`}`

        const headers: Record<string, string> = {
            Authorization: `Bearer ${this.getSecret()}`,
            Accept: 'application/json',
            ...(opts.body !== undefined ? {'Content-Type': 'application/json'} : {}),
            ...(opts.idempotencyKey ? {'Idempotency-Key': opts.idempotencyKey} : {}),
            ...(opts.headers ?? {}),
        }

        const res = await fetch(url, {
            method,
            headers,
            body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
            cache: 'no-store',
        })

        const text = await res.text()
        let parsed: unknown = null
        try {
            parsed = text ? JSON.parse(text) : null
        } catch {
            parsed = text
        }

        const metaRequestId =
            parsed && typeof parsed === 'object'
                ? (parsed as TassiResponse<unknown>).meta?.request_id
                : undefined
        const requestId =
            (typeof metaRequestId === 'string' ? metaRequestId : undefined) ??
            res.headers.get('x-request-id') ??
            undefined

        if (!res.ok) {
            throw new TassiApiError(res.status, parsed as never, path, requestId)
        }
        return parsed as T
    }

    // -------------------------------------------------------------------------
    // Shipments — spec §11
    // -------------------------------------------------------------------------

    /**
     * `POST /v1/shipments` — création d'un envoi.
     * Idempotency-Key obligatoire (spec §10.2).
     */
    async createShipment(
        input: TassiShipmentCreateInput,
        idempotencyKey: string,
    ): Promise<TassiResponse<TassiShipment>> {
        return this.request('POST', '/packages', {body: input, idempotencyKey})
    }

    /** `GET /v1/shipments/{id}` — détail/statut courant. */
    async getShipment(id: string): Promise<TassiResponse<TassiShipment>> {
        return this.request('GET', `/packages/${encodeURIComponent(id)}`)
    }

    /**
     * `POST /v1/shipments/{id}/label` — génération étiquette + tracking_url.
     * Endpoint déduit par convention (spec §16, à valider en sandbox).
     */
    async generateLabel(id: string): Promise<TassiResponse<TassiLabelResponse>> {
        return this.request('POST', `/packages/${encodeURIComponent(id)}/label`)
    }

    /**
     * `DELETE /v1/shipments/{id}` — annulation d'envoi.
     * ⚠️ Endpoint marqué comme HYPOTHÈSE non documentée explicitement (spec §8.3 / §16).
     * À tester en sandbox avant usage en prod.
     */
    async cancelShipment(id: string): Promise<TassiResponse<TassiShipment>> {
        return this.request('DELETE', `/packages/${encodeURIComponent(id)}`)
    }
}

export const tassi = {
    shipments: {
        create: (input: TassiShipmentCreateInput, opts: {idempotencyKey: string}) =>
            client.createShipment(input, opts.idempotencyKey),
        retrieve: (id: string) => client.getShipment(id),
        label: (id: string) => client.generateLabel(id),
        cancel: (id: string) => client.cancelShipment(id),
    },
}

const client = new TassiClient()

export {TassiClient}
