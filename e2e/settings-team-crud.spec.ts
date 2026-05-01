import {test, expect} from '@playwright/test'

const settingsUrl = '/modules/settings'

// Tests E2E dédiés à l'onglet Team (AdminSettings)
// - CRUD: create, update, delete
// - A11y: live region (aria-live polite, aria-atomic true) + annonces i18n
// - Isolation: reset de dc_users avant chaque test pour éviter les interférences

test.describe('Paramètres - Équipe (CRUD + live region)', () => {
	test.beforeEach(async ({page}) => {
		await page.goto(settingsUrl)
		// Isoler les données utilisateurs entre les tests
		await page.evaluate(() => localStorage.removeItem('dc_users'))
		await page.reload()
		await page.getByTestId('tab-team').click()
		await expect(page.getByTestId('panel-team')).toBeVisible()
	})

	test('Validation A11y: erreur visible au blur (role=alert) + aria-invalid/-describedby', async ({page}) => {
		const input = page.locator('#t-name')
		// S'assurer que le champ est vide
		await input.fill('')
		// Déclencher blur (cliquer ailleurs)
		await page.getByTestId('team-form').click()
		// Message d'erreur role=alert (FR ou EN)
		const err = page.getByTestId('team-name-error')
		await expect(err).toHaveText(/^(Le nom est requis|Name is required)$/)
		await expect(err).toHaveAttribute('role', 'alert')
		// Attributs ARIA
		await expect(input).toHaveAttribute('aria-invalid', 'true')
		await expect(input).toHaveAttribute('aria-describedby', 't-name-error')

		// Corriger avec une valeur valide
		await input.fill('E2E Daisy')
		await page.getByTestId('team-form').click()
		await expect(input).not.toHaveAttribute('aria-invalid', 'true')
		await expect(page.locator('[data-testid="team-name-error"]')).toHaveCount(0)
		await expect(page.getByRole('button', {name: /Ajouter|Add/})).toBeEnabled()
	})

	test('Live region présente et configurée (polite + atomic)', async ({page}) => {
		const live = page.getByTestId('team-live-region')
		await expect(live).toHaveAttribute('aria-live', 'polite')
		await expect(live).toHaveAttribute('aria-atomic', 'true')
	})

	test('Création: ajoute une ligne + annonce ARIA', async ({page}) => {
		const rowsBefore = await page.getByTestId('team-row').count()

		const name = `E2E User ${Date.now()}`
		await page.locator('#t-name').fill(name)
		await page.locator('#t-role').selectOption('Viewer')
		await page.locator('#t-status').selectOption('active')
		await page.getByTestId('team-form').press('Enter')

		// Vérifie live region
		await expect(page.getByTestId('team-live-region')).toHaveText(/^(User created|Utilisateur créé)$/)

		// Vérifie ajout de ligne et présence du nom en première ligne
		const rowsAfter = await page.getByTestId('team-row').count()
		expect(rowsAfter).toBe(rowsBefore + 1)
		const firstRow = page.getByTestId('team-row').first()
		await expect(firstRow.locator('td').first()).toHaveText(name)

		// Persistance: recharger la page et vérifier que la ligne existe toujours
		await page.reload()
		await page.getByTestId('tab-team').click()
		await expect(page.getByTestId('team-row').filter({hasText: name})).toHaveCount(1)
	})

	test('Édition: modifie rôle et statut + annonce ARIA', async ({page}) => {
		// Préparation: créer un utilisateur ciblé
		const name = `E2E Edit ${Date.now()}`
		await page.locator('#t-name').fill(name)
		await page.locator('#t-role').selectOption('Viewer')
		await page.locator('#t-status').selectOption('active')
		await page.getByTestId('team-form').press('Enter')
		await expect(page.getByTestId('team-live-region')).toHaveText(/^(User created|Utilisateur créé)$/)

		const firstRow = page.getByTestId('team-row').first()
		await expect(firstRow.locator('td').first()).toHaveText(name)

		// Passe en mode édition
		await firstRow.getByTestId('team-action-edit').click()
		await expect(firstRow.getByTestId('team-edit-role')).toBeVisible()
		await expect(firstRow.getByTestId('team-edit-status')).toBeVisible()
		await firstRow.getByTestId('team-edit-role').selectOption('Editor')
		await firstRow.getByTestId('team-edit-status').selectOption('inactive')
		await firstRow.getByTestId('team-action-save').click()

		await expect(page.getByTestId('team-live-region')).toHaveText(/^(User updated|Utilisateur mis à jour)$/)

		// Vérifie rendu des valeurs traduites visibles
		const cells = firstRow.locator('td')
		await expect(cells.nth(1)).toHaveText(/^(Editor|Éditeur)$/)
		await expect(cells.nth(2)).toHaveText(/^(Inactive|Inactif)$/)

		// Persistance: recharger et vérifier que les valeurs éditées sont conservées
		await page.reload()
		await page.getByTestId('tab-team').click()
		const rowAfterReload = page.getByTestId('team-row').filter({hasText: name})
		await expect(rowAfterReload).toHaveCount(1)
		const cells2 = rowAfterReload.locator('td')
		await expect(cells2.nth(1)).toHaveText(/^(Editor|Éditeur)$/)
		await expect(cells2.nth(2)).toHaveText(/^(Inactive|Inactif)$/)
	})

	test('Suppression: enlève une ligne + annonce ARIA', async ({page}) => {
		// Préparation: créer un utilisateur à supprimer
		const name = `E2E Delete ${Date.now()}`
		await page.locator('#t-name').fill(name)
		await page.locator('#t-role').selectOption('Viewer')
		await page.locator('#t-status').selectOption('active')
		await page.getByTestId('team-form').press('Enter')
		await expect(page.getByTestId('team-live-region')).toHaveText(/^(User created|Utilisateur créé)$/)

		const rowsBefore = await page.getByTestId('team-row').count()
		const firstRow = page.getByTestId('team-row').first()
		await expect(firstRow.locator('td').first()).toHaveText(name)

		// Gérer le dialog de confirmation
		page.once('dialog', dialog => dialog.accept())
		await firstRow.getByTestId('team-action-delete').click()

		await expect(page.getByTestId('team-live-region')).toHaveText(/^(User deleted|Utilisateur supprimé)$/)
		const rowsAfter = await page.getByTestId('team-row').count()
		expect(rowsAfter).toBe(rowsBefore - 1)

		// Persistance: recharger et vérifier que la ligne n'existe plus
		await page.reload()
		await page.getByTestId('tab-team').click()
		await expect(page.getByTestId('team-row').filter({hasText: name})).toHaveCount(0)
	})

	test('Annulation d\'édition: valeurs inchangées + pas d\'annonce update', async ({page}) => {
		// Créer un utilisateur de test
		const name = `E2E Cancel ${Date.now()}`
		await page.locator('#t-name').fill(name)
		await page.locator('#t-role').selectOption('Viewer')
		await page.locator('#t-status').selectOption('active')
		await page.getByTestId('team-form').press('Enter')
		await expect(page.getByTestId('team-live-region')).toHaveText(/^(User created|Utilisateur créé)$/)

		const row = page.getByTestId('team-row').filter({hasText: name}).first()
		await row.getByTestId('team-action-edit').click()
		await expect(row.getByTestId('team-edit-role')).toBeVisible()
		await expect(row.getByTestId('team-edit-status')).toBeVisible()
		await row.getByTestId('team-edit-role').selectOption('Editor')
		await row.getByTestId('team-edit-status').selectOption('inactive')
		await row.getByTestId('team-action-cancel').click()

		// Les valeurs affichées doivent rester les originales
		const cells = row.locator('td')
		await expect(cells.nth(1)).toHaveText(/^(Viewer|Lecteur)$/)
		await expect(cells.nth(2)).toHaveText(/^(Active|Actif)$/)

		// Pas d'annonce de mise à jour
		await expect(page.getByTestId('team-live-region')).not.toHaveText(/(User updated|Utilisateur mis à jour)/)

		// Persistance après reload
		await page.reload()
		await page.getByTestId('tab-team').click()
		const row2 = page.getByTestId('team-row').filter({hasText: name})
		await expect(row2).toHaveCount(1)
		const cells2 = row2.locator('td')
		await expect(cells2.nth(1)).toHaveText(/^(Viewer|Lecteur)$/)
		await expect(cells2.nth(2)).toHaveText(/^(Active|Actif)$/)
	})

	test('Validation: bouton désactivé si nom vide ou espaces, required présent', async ({page}) => {
		// Compter lignes initiales
		const rowsBefore = await page.getByTestId('team-row').count()

		// Input required
		await expect(page.locator('#t-name')).toHaveAttribute('required', '')

		// Bouton désactivé par défaut
		const submit = page.getByRole('button', {name: /Ajouter|Add/})
		await expect(submit).toBeDisabled()

		// Mettre des espaces -> toujours désactivé
		await page.locator('#t-name').fill('   ')
		await expect(submit).toBeDisabled()

		// Aucune création ni annonce
		await expect(page.getByTestId('team-live-region')).toHaveText('')
		const rowsAfter = await page.getByTestId('team-row').count()
		expect(rowsAfter).toBe(rowsBefore)
	})

	test.skip('Tri/Filtre: non implémentés sur AdminSettings (placeholder)', async () => {
		// À implémenter lorsque l\'UI de tri/filtre sera disponible dans AdminSettings
	})
})
