import 'server-only'

import {createClient, type SupabaseClient} from '@supabase/supabase-js'

/**
 * Client Supabase en **service role** — bypass RLS.
 *
 * À utiliser uniquement côté serveur (Server Actions, API routes Node) et
 * UNIQUEMENT après avoir vérifié l'identité + le rôle de l'appelant via la
 * session classique (`createSupabaseServerClient()`).
 *
 * Cas d'usage typique :
 *   1. Lire `auth.users` avec `createSupabaseServerClient()` pour récupérer
 *      le user authentifié et vérifier qu'il a le rôle attendu.
 *   2. Faire les SELECT/UPDATE/INSERT métier avec `createSupabaseServiceClient()`
 *      pour ne pas être bloqué par les RLS très restrictives (ex: `orders`
 *      RLS = `user_id = auth.uid()` qui empêche l'admin de voir les commandes
 *      d'autres users).
 *
 * Ne JAMAIS importer ce module depuis un composant client.
 */
let cached: SupabaseClient | null = null

export function createSupabaseServiceClient(): SupabaseClient {
    if (cached) return cached

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url) {
        throw new Error('SUPABASE_URL manquante (vérifie .env.local)')
    }
    if (!serviceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante (vérifie .env.local)')
    }

    cached = createClient(url, serviceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    })
    return cached
}
