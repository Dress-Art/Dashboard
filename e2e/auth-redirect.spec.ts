import {test, expect} from '@playwright/test'

/**
 * Tests de redirection : un utilisateur non authentifié qui essaie d'accéder
 * aux pages protégées est renvoyé vers /login.
 *
 * On ne teste pas ici le flow authentifié → /not-authorized (rôle non pro)
 * car cela demanderait une session Supabase de test. Voir le scaffold dans
 * `e2e/AUTHENTICATED_TODO.md` pour la suite.
 */

const PROTECTED_PATHS = [
    '/',
    '/modules/orders',
    '/modules/couturier',
    '/modules/tissus',
    '/modules/delivery',
    '/modules/users',
    '/modules/settings',
]

test.describe('Redirection des routes protégées vers /login', () => {
    for (const path of PROTECTED_PATHS) {
        test(`${path} → /login si non authentifié`, async ({page, context}) => {
            // S'assurer qu'aucune session Supabase n'est active
            await context.clearCookies()
            await page.goto(path)

            // Le DashboardLayout déclenche un router.push('/login') côté client
            // au prochain tick après que la session est confirmée absente.
            await expect(page).toHaveURL(/\/login/, {timeout: 10_000})
            await expect(page.getByRole('heading', {name: 'Connexion'})).toBeVisible()
        })
    }
})
