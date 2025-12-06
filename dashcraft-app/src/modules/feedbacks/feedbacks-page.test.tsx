import {
	renderWithProviders,
	screen,
	within,
	fireEvent,
} from '@/test/test-utils'
import {FeedbacksPage} from '@/modules/feedbacks/FeedbacksPage'
import {axe} from 'jest-axe'
import userEvent from '@testing-library/user-event'
import {vi} from 'vitest'

/**
 * Tests d'intégration pour FeedbacksPage
 * - Rendu + accessibilité
 * - Création d'un feedback
 * - Recherche filtrante (Aucun résultat)
 */
describe('FeedbacksPage', () => {
	beforeEach(() => {
		window.localStorage.clear()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('rend la page et est accessible', async () => {
		const {container} = renderWithProviders(<FeedbacksPage />)
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

	it("permet de créer un feedback et de l'afficher", async () => {
		renderWithProviders(<FeedbacksPage />)
		const user = userEvent.setup()
		// Saisir auteur, commentaire, note puis soumettre
		const authorInput = await screen.findByLabelText(/auteur/i)
		expect(authorInput).toBeInTheDocument()
		await authorInput.focus()
		await user.type(authorInput, 'Jean Testeur')
		const commentInput = await screen.findByLabelText(/commentaire/i)
		await commentInput.focus()
		await user.type(commentInput, 'Super module, merci !')
		const ratingInput = await screen.findByLabelText(/note/i)
		await ratingInput.focus()
		await user.type(ratingInput, '4')
		const submitBtn = await screen.findByRole('button', {name: /ajouter/i})
		await user.click(submitBtn)
		// Attendre l'apparition
		const created = await screen.findByText('Jean Testeur')
		expect(created).toBeInTheDocument()
	})

	it('filtre par recherche et affiche "Aucun résultat" pour une requête inédite', async () => {
		renderWithProviders(<FeedbacksPage />)
		const searchbox = await screen.findByRole('searchbox')
		const user = userEvent.setup()
		await user.clear(searchbox)
		await user.type(searchbox, 'zz__aucun_match__zz')
		const empty = await screen.findByText(/aucun résultat/i)
		expect(empty).toBeInTheDocument()
	})

	it('filtre par statut affiche uniquement le statut choisi', async () => {
		renderWithProviders(<FeedbacksPage />)
		const user = userEvent.setup()
		// Créer un feedback explicitement en "résolu" pour éviter l'aléatoire du seed
		await user.type(await screen.findByLabelText(/auteur/i), 'Reso Seed')
		await user.type(await screen.findByLabelText(/commentaire/i), 'c')
		await user.type(await screen.findByLabelText(/note/i), '4')
		// Sélectionner le statut "résolu" dans le formulaire de création
		const createStatus = await screen.findByLabelText(/^statut$/i)
		await user.selectOptions(createStatus, 'resolved')
		await user.click(await screen.findByRole('button', {name: /ajouter/i}))

		// Appliquer le filtre statut "Résolus"
		const filter = await screen.findByLabelText(/filtrer par statut/i)
		await user.selectOptions(filter, 'resolved')
		const table = await screen.findByRole('table')
		// Dans le tableau, il ne doit rester que des "Résolu"
		expect(within(table).queryByText(/en cours/i)).not.toBeInTheDocument()
		expect(within(table).queryByText(/nouveau/i)).not.toBeInTheDocument()
		// Devrait afficher au moins un "Résolu" dans le tableau (singulier), pas le filtre
		const resolvedCells = await within(table).findAllByText(/^résolu$/i)
		expect(resolvedCells.length).toBeGreaterThan(0)
	})

	it('filtre par dates (future) renvoie aucun résultat', async () => {
		renderWithProviders(<FeedbacksPage />)
		const from = await screen.findByLabelText(/date de début/i)
		// Définir une date future pour exclure tous les éléments
		fireEvent.change(from, {target: {value: '2100-01-01'}})
		const empty = await screen.findByText(/aucun résultat/i)
		expect(empty).toBeInTheDocument()
	})

	it('pagination: changement de page et désactivation des boutons', async () => {
		renderWithProviders(<FeedbacksPage />)
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

	it('suppression avec confirmation supprime la ligne et annonce ARIA', async () => {
		renderWithProviders(<FeedbacksPage />)
		const user = userEvent.setup()
		// Créer un élément ciblé
		const authorInput = await screen.findByLabelText(/auteur/i)
		await user.type(authorInput, 'À supprimer')
		const commentInput = await screen.findByLabelText(/commentaire/i)
		await user.type(commentInput, 'temp')
		const ratingInput = await screen.findByLabelText(/note/i)
		await user.type(ratingInput, '3')
		const addBtn = await screen.findByRole('button', {name: /ajouter/i})
		await user.click(addBtn)
		const rowAuthor = await screen.findByText('À supprimer')
		const row = rowAuthor.closest('tr') as HTMLElement
		const delBtn = within(row).getByRole('button', {name: /supprimer/i})
		vi.spyOn(window, 'confirm').mockReturnValue(true)
		await user.click(delBtn)
		// L'élément ne doit plus être là
		expect(screen.queryByText('À supprimer')).not.toBeInTheDocument()
		// Annonce ARIA mise à jour
		const liveMsg = await screen.findByText(/feedback supprimé/i)
		expect(liveMsg).toBeInTheDocument()
	})

	it("édition inline: annuler ne persiste pas les modifications", async () => {
		renderWithProviders(<FeedbacksPage />)
		const user = userEvent.setup()
		// Créer une ligne
		await user.type(await screen.findByLabelText(/auteur/i), 'Edit Annul')
		await user.type(await screen.findByLabelText(/commentaire/i), 'c')
		await user.type(await screen.findByLabelText(/note/i), '2')
		await user.click(await screen.findByRole('button', {name: /ajouter/i}))
		// Éditer puis annuler
		const cell = await screen.findByText('Edit Annul')
		const row = cell.closest('tr') as HTMLElement
		await user.click(within(row).getByRole('button', {name: /modifier/i}))
		const editInput = within(row).getByDisplayValue('Edit Annul')
		await user.clear(editInput)
		await user.type(editInput, 'Modifié')
		await user.click(within(row).getByRole('button', {name: /annuler/i}))
		// Le texte original reste présent
		expect(screen.getByText('Edit Annul')).toBeInTheDocument()
	})

	it('édition inline: enregistrer persiste et annonce ARIA', async () => {
		renderWithProviders(<FeedbacksPage />)
		const user = userEvent.setup()
		// Créer une ligne
		await user.type(await screen.findByLabelText(/auteur/i), 'Edit Save')
		await user.type(await screen.findByLabelText(/commentaire/i), 'c')
		await user.type(await screen.findByLabelText(/note/i), '5')
		await user.click(await screen.findByRole('button', {name: /ajouter/i}))
		// Éditer et enregistrer
		const cell = await screen.findByText('Edit Save')
		const row = cell.closest('tr') as HTMLElement
		await user.click(within(row).getByRole('button', {name: /modifier/i}))
		const editInput = within(row).getByDisplayValue('Edit Save')
		await user.clear(editInput)
		await user.type(editInput, 'Edit Saved')
		// Changer le statut via le select d'édition
		const statusSelect = within(row).getByDisplayValue(/nouveau|en cours|résolu/i)
		await user.selectOptions(statusSelect, 'in_progress')
		await user.click(within(row).getByRole('button', {name: /enregistrer/i}))
		// Nouveau texte et annonce ARIA
		const updated = await screen.findByText('Edit Saved')
		expect(updated).toBeInTheDocument()
		const liveMsg = await screen.findByText(/feedback mis à jour/i)
		expect(liveMsg).toBeInTheDocument()
	})

	it('actions groupées: marquer résolu puis supprimer la sélection', async () => {
		renderWithProviders(<FeedbacksPage />)
		const user = userEvent.setup()
		// Créer deux lignes
		await user.type(await screen.findByLabelText(/auteur/i), 'Bulk A')
		await user.type(await screen.findByLabelText(/commentaire/i), 'c')
		await user.type(await screen.findByLabelText(/note/i), '4')
		await user.click(await screen.findByRole('button', {name: /ajouter/i}))
		await user.type(await screen.findByLabelText(/auteur/i), 'Bulk B')
		await user.type(await screen.findByLabelText(/commentaire/i), 'c')
		await user.type(await screen.findByLabelText(/note/i), '3')
		await user.click(await screen.findByRole('button', {name: /ajouter/i}))
		// Sélectionner les deux lignes
		const rowA = (await screen.findByText('Bulk A')).closest('tr') as HTMLElement
		const rowB = (await screen.findByText('Bulk B')).closest('tr') as HTMLElement
		await user.click(
			within(rowA).getByRole('checkbox', {name: /sélectionner la ligne/i}),
		)
		await user.click(
			within(rowB).getByRole('checkbox', {name: /sélectionner la ligne/i}),
		)
		// La toolbar bulk apparaît
		const bulkRegion = await screen.findByRole('region', {
			name: /actions groupées/i,
		})
		expect(bulkRegion).toBeInTheDocument()
		// Marquer résolu
		await user.click(screen.getByRole('button', {name: /marquer résolu/i}))
		// Les deux lignes doivent afficher "Résolu"
		await within(rowA).findByText(/résolu/i)
		await within(rowB).findByText(/résolu/i)
		// Après l'action bulk, la sélection est vidée par le composant.
		// Re-sélectionner les deux lignes avant la suppression groupée
		const rowA2 = (await screen.findByText('Bulk A')).closest('tr') as HTMLElement
		const rowB2 = (await screen.findByText('Bulk B')).closest('tr') as HTMLElement
		await user.click(
			within(rowA2).getByRole('checkbox', {name: /sélectionner la ligne/i}),
		)
		await user.click(
			within(rowB2).getByRole('checkbox', {name: /sélectionner la ligne/i}),
		)
		// Supprimer la sélection
		vi.spyOn(window, 'confirm').mockReturnValue(true)
		await user.click(
			screen.getByRole('button', {name: /supprimer la sélection/i}),
		)
		expect(screen.queryByText('Bulk A')).not.toBeInTheDocument()
		expect(screen.queryByText('Bulk B')).not.toBeInTheDocument()
	})
})
