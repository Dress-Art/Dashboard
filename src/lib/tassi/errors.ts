/**
 * Mapping erreurs Tassi → messages utilisateur FR.
 * Référence : spec §12.
 */

import type {TassiErrorBody} from './types'

export class TassiApiError extends Error {
    constructor(
        public readonly status: number,
        public readonly body: TassiErrorBody | string | null,
        public readonly path: string,
        public readonly requestId?: string,
    ) {
        const code = typeof body === 'object' && body ? body.error?.code : undefined
        const message = typeof body === 'object' && body ? body.error?.message : undefined
        super(`Tassi ${status} ${path}: ${code ?? 'error'} — ${message ?? 'no message'}`)
        this.name = 'TassiApiError'
    }
}

/**
 * Codes Tassi documentés (spec §12) → message utilisateur FR.
 * À enrichir au fil des retours observés en sandbox.
 */
const HTTP_TO_FR: Record<number, string> = {
    400: 'Requête invalide.',
    401: 'Authentification Tassi échouée. Vérifie TASSI_SECRET_KEY.',
    403: 'Action non autorisée par Tassi.',
    404: 'Ressource Tassi introuvable.',
    409: 'État incompatible côté Tassi.',
    422: 'Validation Tassi échouée.',
    429: 'Trop de requêtes Tassi — réessayez dans un instant.',
    500: 'Erreur Tassi côté serveur.',
    502: 'Tassi temporairement indisponible.',
    503: 'Tassi temporairement indisponible.',
}

export function describeTassiError(err: unknown): string {
    if (err instanceof TassiApiError) {
        if (typeof err.body === 'object' && err.body !== null) {
            const b = err.body as {
                error?: {message?: string}
                message?: string | string[]
            }
            // Forme spec (.com/v1) : { error: { message: "..." } }
            if (b.error?.message) return b.error.message
            // Forme observée (.pro/packages) : { message: "..." } ou ["...", "..."]
            if (Array.isArray(b.message)) return b.message.join(' ; ')
            if (typeof b.message === 'string') return b.message
        }
        if (typeof err.body === 'string' && err.body.length > 0) return err.body
        return HTTP_TO_FR[err.status] ?? `Erreur Tassi (HTTP ${err.status})`
    }
    if (err instanceof Error) return err.message
    return 'Erreur inattendue Tassi.'
}

/**
 * Vrai si l'erreur est éligible à un retry (5xx ou 429). Spec §12.
 */
export function isRetriableTassiError(err: unknown): boolean {
    if (!(err instanceof TassiApiError)) return false
    return err.status === 429 || (err.status >= 500 && err.status < 600)
}
