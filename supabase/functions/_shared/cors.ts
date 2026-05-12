/**
 * Helpers CORS partagés pour toutes les Edge Functions Supabase de DressArt.
 *
 * Usage type dans une Edge Function :
 *
 *   import {corsHeaders, handlePreflight, jsonResponse} from '../_shared/cors.ts'
 *
 *   Deno.serve(async (req) => {
 *     const preflight = handlePreflight(req)
 *     if (preflight) return preflight
 *
 *     // ... logique ...
 *     return jsonResponse({data: result})
 *   })
 *
 * Pourquoi : le browser bloque silencieusement les fetches cross-origin
 * quand la function ne répond pas au preflight `OPTIONS` avec les bons
 * headers — l'erreur affichée côté navigateur est juste « Failed to fetch »,
 * impossible à diagnostiquer sans inspecter le réseau.
 */

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
} as const

/**
 * Si la requête est un preflight OPTIONS, renvoie la réponse `200 ok` adaptée.
 * Sinon renvoie `null` — l'appelant continue son traitement habituel.
 */
export function handlePreflight(req: Request): Response | null {
    if (req.method === 'OPTIONS') {
        return new Response('ok', {headers: corsHeaders})
    }
    return null
}

/**
 * Réponse JSON avec les headers CORS pré-câblés.
 * Toujours utiliser ce helper plutôt que `new Response(...)` direct pour
 * que CORS soit appliqué uniformément.
 */
export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
    const extraHeaders =
        init.headers instanceof Headers
            ? Object.fromEntries(init.headers.entries())
            : (init.headers as Record<string, string> | undefined) ?? {}
    return new Response(JSON.stringify(body), {
        ...init,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            ...extraHeaders,
        },
    })
}

/** Helpers express pour les codes courants. */
export const responses = {
    ok: <T>(body: T): Response => jsonResponse(body, {status: 200}),
    created: <T>(body: T): Response => jsonResponse(body, {status: 201}),
    badRequest: (message: string, details?: unknown): Response =>
        jsonResponse({error: 'bad_request', message, details}, {status: 400}),
    unauthorized: (message = 'Unauthorized'): Response =>
        jsonResponse({error: 'unauthorized', message}, {status: 401}),
    forbidden: (message = 'Forbidden'): Response =>
        jsonResponse({error: 'forbidden', message}, {status: 403}),
    notFound: (message = 'Not found'): Response =>
        jsonResponse({error: 'not_found', message}, {status: 404}),
    methodNotAllowed: (allowed: string[]): Response =>
        jsonResponse(
            {error: 'method_not_allowed', allowed},
            {status: 405, headers: {Allow: allowed.join(', ')}},
        ),
    serverError: (message = 'Internal server error', details?: unknown): Response =>
        jsonResponse({error: 'server_error', message, details}, {status: 500}),
}
