import {renderWithProviders, screen} from '@/test/test-utils'
import {EmailsPage} from '@/modules/emails/EmailsPage'
import {axe} from 'jest-axe'
import userEvent from '@testing-library/user-event'

/**
 * Tests d'intégration pour EmailsPage
 * - Rendu + accessibilité
 * - Création d'un email
 * - Recherche filtrante (Aucun résultat)
 */
describe('EmailsPage', () => {
	beforeEach(() => {
		window.localStorage.clear()
	})

	it('rend la page et est accessible', async () => {
		const {container} = renderWithProviders(<EmailsPage />)
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

	it("permet de créer un email et de l'afficher", async () => {
		renderWithProviders(<EmailsPage />)
		const user = userEvent.setup()
		// Saisir un sujet et un expéditeur puis soumettre
		const subjectInput = await screen.findByLabelText(/sujet/i)
		expect(subjectInput).toBeInTheDocument()
		await subjectInput.focus()
		await user.type(subjectInput, 'Sujet de test')
		const fromInput = await screen.findByLabelText(/^de$/i)
		await fromInput.focus()
		await user.type(fromInput, 'test@example.com')
		const submitBtn = await screen.findByRole('button', {name: /ajouter/i})
		await user.click(submitBtn)
		// Attendre l'apparition
		const created = await screen.findByText('Sujet de test')
		expect(created).toBeInTheDocument()
	})

	it('filtre par recherche et affiche "Aucun résultat" pour une requête inédite', async () => {
		renderWithProviders(<EmailsPage />)
		const searchbox = await screen.findByRole('searchbox')
		const user = userEvent.setup()
		await user.clear(searchbox)
		await user.type(searchbox, 'zz__aucun_match__zz')
		const empty = await screen.findByText(/aucun résultat/i)
		expect(empty).toBeInTheDocument()
	})
})
