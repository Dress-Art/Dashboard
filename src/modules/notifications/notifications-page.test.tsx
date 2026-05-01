import {renderWithProviders, screen} from '@/test/test-utils'
import {NotificationsPage} from '@/modules/notifications/NotificationsPage'
import {axe} from 'jest-axe'
import userEvent from '@testing-library/user-event'

/**
 * Tests d'intégration pour NotificationsPage
 * - Rendu + accessibilité
 * - Création d'une notification
 * - Recherche filtrante (Aucun résultat)
 */
describe('NotificationsPage', () => {
	beforeEach(() => {
		window.localStorage.clear()
	})

	it('rend la page et est accessible', async () => {
		const {container} = renderWithProviders(<NotificationsPage />)
		// Titre principal
		const h1 = await screen.findByRole('heading', {level: 1})
		expect(h1).toBeInTheDocument()
		// Tableau chargé
		const table = await screen.findByRole('table')
		expect(table).toBeInTheDocument()
		// Axe a11y
		const results = await axe(container)
		expect(results).toHaveNoViolations()
	})

	it('permet de créer une notification et de la voir listée', async () => {
		renderWithProviders(<NotificationsPage />)
		const user = userEvent.setup()
		// Saisir un titre et soumettre
		const titleInput = await screen.findByLabelText(/titre/i)
		expect(titleInput).toBeInTheDocument()
		await titleInput.focus()
		await user.type(titleInput, 'Note de test')
		const submitBtn = await screen.findByRole('button', {name: /ajouter/i})
		await user.click(submitBtn)
		// Attendre l'apparition
		const created = await screen.findByText('Note de test')
		expect(created).toBeInTheDocument()
	})

	it('filtre par recherche et affiche "Aucun résultat" pour une requête inédite', async () => {
		renderWithProviders(<NotificationsPage />)
		const searchbox = await screen.findByRole('searchbox')
		const user = userEvent.setup()
		await user.clear(searchbox)
		await user.type(searchbox, 'zz__aucun_match__zz')
		const empty = await screen.findByText(/aucun résultat/i)
		expect(empty).toBeInTheDocument()
	})
})
