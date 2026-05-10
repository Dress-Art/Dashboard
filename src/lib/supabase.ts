import {createBrowserClient} from '@supabase/ssr'

/**
 * Client Supabase navigateur. Stocke la session dans des **cookies** (via
 * `@supabase/ssr`) au lieu de localStorage — c'est ce qui permet aux
 * Server Actions et API routes Next.js de lire la session côté serveur via
 * `createSupabaseServerClient()` depuis `./supabase/server`.
 *
 * Sans ce changement, le serveur ne voyait jamais l'utilisateur connecté
 * et renvoyait `unauthorized` (getOrderTassiContext, POST /api/tassi/...).
 *
 * À n'importer **que côté client** (composants `'use client'`).
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
