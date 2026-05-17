import {NextResponse, type NextRequest} from 'next/server'
import {createSupabaseServerClient} from '@/lib/supabase/server'

/**
 * /auth/callback
 *
 * Endpoint serveur d'échange PKCE pour les flows Supabase (password reset,
 * magic link, OAuth). Le code_verifier est stocké en cookie HttpOnly par
 * `@supabase/ssr` — invisible côté JS — donc l'exchange DOIT se faire ici.
 *
 * Usage côté client : passer `redirectTo: ${SITE_URL}/auth/callback?next=/reset-password`
 * à `resetPasswordForEmail()` (ou autre).
 *
 * En cas d'erreur, on redirige vers `next` (ou `/login`) avec `?error=...`
 * pour que la page cible affiche un message lisible.
 */
export async function GET(request: NextRequest) {
    const {searchParams, origin} = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/reset-password'

    if (!code) {
        return NextResponse.redirect(`${origin}${next}?error=missing_code`)
    }

    const supabase = await createSupabaseServerClient()
    const {error} = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
        return NextResponse.redirect(
            `${origin}${next}?error=${encodeURIComponent(error.message)}`,
        )
    }

    return NextResponse.redirect(`${origin}${next}`)
}
