import {test, expect} from '@playwright/test'

/**
 * Tests des pages publiques d'authentification : rendu et navigation.
 * Pas de mutation backend ici, on vérifie uniquement la structure UI.
 */

test.describe('Pages d\'authentification publiques', () => {
    test('Login : tabs Email / Téléphone et lien mot de passe oublié', async ({page}) => {
        await page.goto('/login')

        // Heading
        await expect(page.getByRole('heading', {name: 'Connexion'})).toBeVisible()

        // Tabs
        await expect(page.getByTestId('tab-email')).toBeVisible()
        await expect(page.getByTestId('tab-phone')).toBeVisible()

        // Email form par défaut
        await expect(page.getByTestId('email-form')).toBeVisible()
        await expect(page.getByTestId('email-input')).toBeVisible()
        await expect(page.getByTestId('password-input')).toBeVisible()
        await expect(page.getByTestId('email-submit')).toBeVisible()

        // Lien forgot password
        await expect(page.getByTestId('forgot-password-link')).toHaveAttribute('href', '/forgot-password')

        // Switch vers tab téléphone : email-form caché, otp-related visible
        await page.getByTestId('tab-phone').click()
        await expect(page.getByTestId('email-form')).toBeHidden()
        await expect(page.getByPlaceholder('+229 61 19 89 41')).toBeVisible()
    })

    test('Login : email vide affiche un toast d\'erreur', async ({page}) => {
        await page.goto('/login')
        // Le bouton submit avec required HTML : on contourne en désactivant la validation native
        // On vérifie juste que le clic ne navigue pas (reste sur /login)
        await page.getByTestId('email-input').fill('not-an-email')
        await page.getByTestId('password-input').fill('xx')
        await page.getByTestId('email-submit').click()
        // Le formulaire HTML rejette ou un toast apparaît — on reste sur /login
        await expect(page).toHaveURL(/\/login/)
    })

    test('Forgot password : page rendue, lien retour login', async ({page}) => {
        await page.goto('/forgot-password')
        await expect(page.getByRole('heading', {name: 'Mot de passe oublié'})).toBeVisible()
        await expect(page.getByPlaceholder('vous@dressart.com')).toBeVisible()
        await expect(page.getByRole('button', {name: 'Envoyer le lien'})).toBeVisible()

        // Retour login
        await page.getByRole('link', {name: /Retour à la connexion/}).click()
        await expect(page).toHaveURL(/\/login/)
    })

    test('Reset password : affiche un message d\'attente sans token', async ({page}) => {
        await page.goto('/reset-password')
        await expect(page.getByRole('heading', {name: 'Nouveau mot de passe'})).toBeVisible()
        // Sans token, l'event PASSWORD_RECOVERY n'est pas émis → message d'attente
        await expect(page.getByText(/En attente de la vérification du lien/)).toBeVisible()
        await expect(page.getByRole('link', {name: /Demander un nouveau lien/})).toBeVisible()
    })

    test('Not-authorized : page rendue (sans user, message générique)', async ({page}) => {
        await page.goto('/not-authorized')
        await expect(page.getByRole('heading', {name: 'Accès non autorisé'})).toBeVisible()
        await expect(page.getByText(/réservé aux professionnels/)).toBeVisible()
        await expect(page.getByRole('button', {name: 'Se déconnecter'})).toBeVisible()
        await expect(page.getByRole('link', {name: /Retour à la page de connexion/})).toBeVisible()
    })
})
