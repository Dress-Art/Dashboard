import {test, expect} from '@playwright/test'

const settingsUrl = '/modules/settings'

// Tests spécifiques aux onglets Profil et Équipe
// - Navigation et visibilité des panneaux
// - Attributs ARIA (role, aria-selected, aria-controls, aria-labelledby)
// - i18n de base: tablist possède un aria-label non vide

test.describe('Paramètres - Profil & Équipe', () => {
	test.beforeEach(async ({page}) => {
		await page.goto(settingsUrl)
		await expect(page.getByTestId('panel-profile')).toBeVisible()
	})

	test('Onglet Profil visible par défaut + a11y', async ({page}) => {
		const tablist = page.getByRole('tablist')
		await expect(tablist).toBeVisible()
		await expect(tablist).toHaveAttribute('aria-label', /.+/)

		const tabProfile = page.getByTestId('tab-profile')
		const panelProfile = page.getByTestId('panel-profile')
		await expect(tabProfile).toHaveAttribute('role', 'tab')
		await expect(tabProfile).toHaveAttribute('aria-selected', 'true')
		await expect(tabProfile).toHaveAttribute('aria-controls', 'panel-profile')
		await expect(panelProfile).toHaveAttribute('role', 'tabpanel')
		await expect(panelProfile).toHaveAttribute('aria-labelledby', 'tab-profile')
		await expect(panelProfile).toBeVisible()
	})

	test('Onglet Équipe: navigation + sélection ARIA', async ({page}) => {
		const tabTeam = page.getByTestId('tab-team')
		const tabProfile = page.getByTestId('tab-profile')
		const panelTeam = page.getByTestId('panel-team')
		const panelProfile = page.getByTestId('panel-profile')

		await tabTeam.click()
		await expect(panelTeam).toBeVisible()
		await expect(panelProfile).toBeHidden()
		await expect(tabTeam).toHaveAttribute('aria-selected', 'true')
		await expect(tabProfile).toHaveAttribute('aria-selected', 'false')

		// Retour au profil
		await tabProfile.click()
		await expect(panelProfile).toBeVisible()
		await expect(panelTeam).toBeHidden()
	})

	test('Onglet Dashboard: rôles ARIA présents', async ({page}) => {
		await page.getByTestId('tab-dashboard').click()
		const tabDashboard = page.getByTestId('tab-dashboard')
		const panelDashboard = page.getByTestId('panel-dashboard')
		await expect(tabDashboard).toHaveAttribute('role', 'tab')
		await expect(panelDashboard).toHaveAttribute('role', 'tabpanel')
	})
})
