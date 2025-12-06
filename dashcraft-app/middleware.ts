import createMiddleware from 'next-intl/middleware'

// i18n middleware configuration (no URL prefix)
export default createMiddleware({
	locales: ['fr', 'en'],
	defaultLocale: 'fr',
	localePrefix: 'never',
})

// Match all paths except Next.js internals and static files
export const config = {
	// Exclure les routes internes et les fichiers statiques
	// Forme recommandée évitant les lookaheads en tête de segment
	matcher: ['/', '/((?!api|_next|_vercel|.*\\..*).*)'],
}
