import {
	renderWithProviders,
	screen,
	within,
} from '@/test/test-utils'
import {ChatsPage} from '@/modules/chats/ChatsPage'
import {axe} from 'jest-axe'
import userEvent from '@testing-library/user-event'
import {vi} from 'vitest'

/**
 * Tests d'intégration pour ChatsPage
 * - Rendu + accessibilité
 * - Création avec annonce ARIA
 * - Édition inline (annuler / enregistrer) + annonces ARIA
 * - Suppression avec confirmation + annonce ARIA
 * - Filtrage par statut
 * - Pagination (page suivante/précédente, taille)
 */
describe('ChatsPage', () => {
	beforeEach(() => {
		window.localStorage.clear()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('rend la page et est accessible', async () => {
		const {container} = renderWithProviders(<ChatsPage />)
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

	it('création: ajoute une ligne et annonce ARIA', async () => {
		renderWithProviders(<ChatsPage />)
		const user = userEvent.setup()
		// Saisir titre, participants, statut puis soumettre
		const titleInput = await screen.findByLabelText(/titre/i)
		await user.type(titleInput, 'Thread Test')
		const participantsInput = await screen.findByLabelText(/participants/i)
		await user.clear(participantsInput)
		await user.type(participantsInput, '3')
		// Laisser le statut par défaut (Ouvert)
		const submitBtn = await screen.findByRole('button', {name: /ajouter/i})
		await user.click(submitBtn)
		// Attendre apparition + annonce ARIA
		const createdRowText = await screen.findByText('Thread Test')
		expect(createdRowText).toBeInTheDocument()
		const liveCreated = await screen.findByText(/conversation créée/i)
		expect(liveCreated).toBeInTheDocument()
	})

	it("édition inline: annuler ne persiste pas les modifications", async () => {
		renderWithProviders(<ChatsPage />)
		const user = userEvent.setup()
		// Créer une ligne à éditer
		await user.type(await screen.findByLabelText(/titre/i), 'Edit Annul')
		await user.click(await screen.findByRole('button', {name: /ajouter/i}))
		const cell = await screen.findByText('Edit Annul')
		const row = cell.closest('tr') as HTMLElement
		// Passer en mode édition
		await user.click(within(row).getByRole('button', {name: /modifier/i}))
		const editInput = within(row).getByDisplayValue('Edit Annul')
		await user.clear(editInput)
		await user.type(editInput, 'Modifié')
		// Annuler
		await user.click(within(row).getByRole('button', {name: /annuler/i}))
		// Le texte original reste
		expect(screen.getByText('Edit Annul')).toBeInTheDocument()
	})

	it('édition inline: enregistrer persiste et annonce ARIA', async () => {
		renderWithProviders(<ChatsPage />)
		const user = userEvent.setup()
		// Créer une ligne à éditer (statut par défaut Ouvert)
		await user.type(await screen.findByLabelText(/titre/i), 'Edit Save')
		await user.click(await screen.findByRole('button', {name: /ajouter/i}))
		const cell = await screen.findByText('Edit Save')
		const row = cell.closest('tr') as HTMLElement
		await user.click(within(row).getByRole('button', {name: /modifier/i}))
		// Modifier le titre
		const editInput = within(row).getByDisplayValue('Edit Save')
		await user.clear(editInput)
		await user.type(editInput, 'Edit Saved')
		// Changer le statut via le select d'édition
		const statusSelect = within(row).getByDisplayValue(/ouvert|archivé/i)
		await user.selectOptions(statusSelect, 'archived')
		// Enregistrer
		await user.click(within(row).getByRole('button', {name: /enregistrer/i}))
		// Nouveau texte et annonce ARIA
		const updated = await screen.findByText('Edit Saved')
		expect(updated).toBeInTheDocument()
		const liveMsg = await screen.findByText(/conversation mise à jour/i)
		expect(liveMsg).toBeInTheDocument()
		// Le statut affiché doit être Archivé dans la ligne
		await within(updated.closest('tr') as HTMLElement).findByText(/^archivé$/i)
	})

	it('suppression: confirme, supprime et annonce ARIA', async () => {
		renderWithProviders(<ChatsPage />)
		const user = userEvent.setup()
		// Créer une ligne puis la supprimer
		await user.type(await screen.findByLabelText(/titre/i), 'À supprimer Chat')
		await user.click(await screen.findByRole('button', {name: /ajouter/i}))
		const cell = await screen.findByText('À supprimer Chat')
		const row = cell.closest('tr') as HTMLElement
		vi.spyOn(window, 'confirm').mockReturnValue(true)
		await user.click(within(row).getByRole('button', {name: /supprimer/i}))
		// L'élément ne doit plus exister
		expect(screen.queryByText('À supprimer Chat')).not.toBeInTheDocument()
		// Annonce ARIA
		const liveDeleted = await screen.findByText(/conversation supprimée/i)
		expect(liveDeleted).toBeInTheDocument()
	})

	it('filtrage par statut: affiche uniquement le statut choisi', async () => {
		renderWithProviders(<ChatsPage />)
		const user = userEvent.setup()
		// Créer une conversation explicitement Archivée
		await user.type(await screen.findByLabelText(/titre/i), 'Archived Seed')
		const createStatus = await screen.findByLabelText(/^statut$/i)
		await user.selectOptions(createStatus, 'archived')
		await user.click(await screen.findByRole('button', {name: /ajouter/i}))
		// Appliquer le filtre statut Archivé
		const filter = await screen.findByLabelText(/filtrer par statut/i)
		await user.selectOptions(filter, 'archived')
		const table = await screen.findByRole('table')
		// La table ne doit contenir aucun Ouvert, et au moins un Archivé
		expect(within(table).queryByText(/^ouvert$/i)).not.toBeInTheDocument()
		const archivedCells = await within(table).findAllByText(/^archivé$/i)
		expect(archivedCells.length).toBeGreaterThan(0)
	})

	it('pagination: changement de page et désactivation des boutons', async () => {
		renderWithProviders(<ChatsPage />)
		const user = userEvent.setup()
		const pageSize = await screen.findByLabelText(/taille/i)
		await user.selectOptions(pageSize, '5')
		const nextBtn = await screen.findByRole('button', {name: /suivant/i})
		const prevBtn = await screen.findByRole('button', {name: /précédent/i})
		// Au départ, précédent désactivé
		expect(prevBtn).toBeDisabled()
		await user.click(nextBtn)
		// Maintenant, précédent devrait être activé
		expect(prevBtn).not.toBeDisabled()
		const pageLabel = await screen.findByText(/page\s+2\s+sur/i)
		expect(pageLabel).toBeInTheDocument()
	})
})
