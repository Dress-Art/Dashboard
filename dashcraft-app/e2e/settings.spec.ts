import {test, expect} from '@playwright/test'

const settingsUrl = '/modules/settings'

// Les tests se basent sur des data-testid stables ajoutés dans SettingsPage/SettingsWidget
// et sur la sidebar (DashboardLayout/Sidebar)

test.describe('Paramètres - préférences UI (Redux + persistance)', () => {
	test.beforeEach(async ({page}) => {
		await page.goto(settingsUrl)
		await expect(page.getByTestId('panel-profile')).toBeVisible()
	})

	test('Navigation par onglets', async ({page}) => {
		await expect(page.getByTestId('panel-profile')).toBeVisible()
		await page.getByTestId('tab-dashboard').click()
		await expect(page.getByTestId('panel-dashboard')).toBeVisible()
		await expect(page.getByTestId('panel-profile')).toBeHidden()
		await page.getByTestId('tab-system').click()
		await expect(page.getByTestId('panel-system')).toBeVisible()
	})

	test('Sélection du thème et persistance', async ({page}) => {
		await page.getByTestId('tab-system').click()
		const lightRadio = page.getByTestId('theme-radio-light')
		await lightRadio.check()
		await expect(lightRadio).toBeChecked()
		await page.reload()
		await page.getByTestId('tab-system').click()
		await expect(page.getByTestId('theme-radio-light')).toBeChecked()
	})

	test('Toggle de la sidebar (afficher/masquer) avec persistance', async ({page}) => {
		await page.getByTestId('tab-system').click()
		const sidebar = page.getByTestId('sidebar-container')
		await expect(sidebar).toBeVisible()
		const checkbox = page.getByTestId('sidebar-open')
		await checkbox.uncheck()
		await expect(sidebar).toBeHidden()
		await page.reload()
		await page.getByTestId('tab-system').click()
		await expect(page.getByTestId('sidebar-container')).toBeHidden()
	})

	test('Visibilité des modules: Tout masquer / Tout afficher + impact sur la sidebar', async ({page}) => {
		// S'assurer que la sidebar est visible dans ce test (nouveau contexte)
		const sidebar = page.getByTestId('sidebar-container')
		await expect(sidebar).toBeVisible()

		await page.getByTestId('tab-dashboard').click()

		const paymentsToggle = page.getByTestId('module-toggle-payments')
		await page.getByTestId('modules-deselect-all').click()
		await expect(paymentsToggle).not.toBeChecked()

		const sidebarNav = page.getByTestId('sidebar-nav')
		await expect(sidebarNav.locator('a[href="/modules/payments"]')).toHaveCount(0)

		await page.getByTestId('modules-select-all').click()
		await expect(paymentsToggle).toBeChecked()
		await expect(sidebarNav.locator('a[href="/modules/payments"]')).toHaveCount(1)

		await page.reload()
		await page.getByTestId('tab-dashboard').click()
		await expect(page.getByTestId('module-toggle-payments')).toBeChecked()
	})
})
