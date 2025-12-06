import React from 'react'
import {renderWithProviders, screen, waitFor, within} from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import {describe, it, expect, beforeEach, vi} from 'vitest'
import {InternalApisWidget} from '@/modules/monitoring/InternalApisWidget'
import type {InternalApiMetrics, InternalApiLog} from '@/lib/useApi'

/**
 * Tests pour InternalApisWidget
 * - Mock de useApi().internalApis.getMetrics / refreshMetrics / listLogs
 * - Vérifie le rendu initial des métriques et de la table des logs
 * - Vérifie l'actualisation via le bouton Rafraîchir (métriques + logs)
 */
let mockGetMetrics: () => Promise<InternalApiMetrics>
let mockRefreshMetrics: () => Promise<InternalApiMetrics>
let mockListLogs: (params?: {
	page?: number
	pageSize?: number
	q?: string
	statusClass?: 'all' | '2xx' | '4xx' | '5xx'
	method?: 'ALL' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
}) => Promise<{items: InternalApiLog[]; total: number; page: number; pageSize: number; totalPages: number}>

vi.mock('@/lib/useApi', () => {
	return {
		useApi: () => ({
			internalApis: {
				getMetrics: () => mockGetMetrics(),
				refreshMetrics: () => mockRefreshMetrics(),
				listLogs: (params?: {
					page?: number
					pageSize?: number
					q?: string
					statusClass?: 'all' | '2xx' | '4xx' | '5xx'
					method?: 'ALL' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
				}) => mockListLogs(params),
			},
		}),
	}
})

describe('InternalApisWidget', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		window.localStorage.clear()
		mockGetMetrics = vi.fn(async () => ({
			successRatePct: 95,
			errorRatePct: 5,
			avgResponseMs: 120,
			requestsLast24h: 12345,
			updatedAt: new Date().toISOString(),
		}))
		const initialLogs: InternalApiLog[] = [
			{
				id: '1',
				time: new Date().toISOString(),
				method: 'GET',
				route: '/auth/login',
				status: 200,
				durationMs: 93,
				user: 'alice',
			},
			{
				id: '2',
				time: new Date().toISOString(),
				method: 'POST',
				route: '/users',
				status: 201,
				durationMs: 140,
				user: 'bob',
			},
		]
		mockListLogs = vi.fn(async ({page = 1, pageSize = 8} = {}) => ({
			items: initialLogs.slice(0, pageSize),
			total: initialLogs.length,
			page,
			pageSize,
			totalPages: 1,
		}))
		mockRefreshMetrics = vi.fn(async () => ({
			successRatePct: 97,
			errorRatePct: 3,
			avgResponseMs: 98,
			requestsLast24h: 13000,
			updatedAt: new Date(Date.now() + 60_000).toISOString(),
		}))
	})

	it('affiche les métriques initiales et les entêtes de logs', async () => {
		renderWithProviders(<InternalApisWidget />)
		// Attendre chargement
		await screen.findByText(/95\s*%/)
		expect(screen.getByText('Taux de succès')).toBeInTheDocument()
		expect(screen.getByText('Taux d’erreur')).toBeInTheDocument()
		expect(screen.getByText('Temps moyen')).toBeInTheDocument()
		expect(screen.getByText('Requêtes (24h)')).toBeInTheDocument()

		// Entêtes du tableau (scope sur le tableau pour éviter la collision avec les labels)
		const table = screen.getByRole('table', {name: 'Logs récents'})
		const tableScope = within(table)
		expect(tableScope.getByRole('columnheader', {name: 'Heure'})).toBeInTheDocument()
		expect(tableScope.getByRole('columnheader', {name: 'Méthode'})).toBeInTheDocument()
		expect(tableScope.getByRole('columnheader', {name: 'Route'})).toBeInTheDocument()
		expect(tableScope.getByRole('columnheader', {name: 'Statut'})).toBeInTheDocument()
		expect(tableScope.getByRole('columnheader', {name: 'Durée'})).toBeInTheDocument()
		expect(tableScope.getByRole('columnheader', {name: 'Utilisateur'})).toBeInTheDocument()

		// Lignes initiales
		expect(screen.getByText('alice')).toBeInTheDocument()
		expect(screen.getByText('bob')).toBeInTheDocument()
	})

	it("affiche et met à jour 'Dernière mise à jour' après rafraîchissement", async () => {
		renderWithProviders(<InternalApisWidget />)
		await screen.findByText(/95\s*%/)
		const para = screen.getByText(/Dernière mise à jour/i)
		const initialText = para.textContent
		// Prépare un refresh avec timestamp différent
		mockRefreshMetrics = vi.fn(async () => ({
			successRatePct: 97,
			errorRatePct: 3,
			avgResponseMs: 98,
			requestsLast24h: 13000,
			updatedAt: new Date(Date.now() + 90_000).toISOString(),
		}))
		const user = userEvent.setup()
		await user.click(screen.getByRole('button', {name: /rafraîchir/i}))
		await waitFor(() => {
			expect(mockRefreshMetrics).toHaveBeenCalledTimes(1)
			const paraAfter = screen.getByText(/Dernière mise à jour/i)
			expect(paraAfter.textContent).not.toBe(initialText)
		})
	})

	it('rafraîchit les métriques et recharge les logs au clic', async () => {
		renderWithProviders(<InternalApisWidget />)
		await screen.findByText(/95\s*%/)
		const user = userEvent.setup()
		// Injecter de nouveaux logs après refresh
		const refreshedLogs: InternalApiLog[] = [
			{
				id: '3',
				time: new Date().toISOString(),
				method: 'PATCH',
				route: '/emails',
				status: 200,
				durationMs: 75,
				user: 'charlie',
			},
		]
		mockListLogs = vi.fn(async ({page = 1, pageSize = 8} = {}) => ({
			items: refreshedLogs.slice(0, pageSize),
			total: refreshedLogs.length,
			page,
			pageSize,
			totalPages: 1,
		}))

		await user.click(screen.getByRole('button', {name: /rafraîchir/i}))
		await waitFor(() => {
			expect(mockRefreshMetrics).toHaveBeenCalledTimes(1)
			// Métriques mises à jour
			const successLabel = screen.getByText('Taux de succès')
			expect(successLabel.parentElement).toHaveTextContent(/97\s*%/)
			const avgLabel = screen.getByText('Temps moyen')
			expect(avgLabel.parentElement).toHaveTextContent(/98\s*ms/i)
			// Logs rechargés
			expect(screen.getByText('charlie')).toBeInTheDocument()
		})
	})

	it('affiche le temps relatif entre parenthèses (FR ou EN)', async () => {
		renderWithProviders(<InternalApisWidget />)
		await screen.findByText(/95\s*%/)
		const para = screen.getByText(/Dernière mise à jour/i)
		expect(para).toHaveTextContent(/\((il y a .*?|.* ago)\)/i)
	})

	it('affiche les filtres et la pagination, et applique les interactions', async () => {
		// Prépare un mock avec plusieurs pages pour tester la pagination
		const totalPages = 3
		mockListLogs = vi.fn(async ({page = 1, pageSize = 8} = {}) => ({
			items: [],
			total: 0,
			page,
			pageSize,
			totalPages,
		}))

		renderWithProviders(<InternalApisWidget />)
		// Attendre chargement initial
		await screen.findByText('Heure')

		// Vérifie présence des contrôles et valeurs par défaut
		const methodSelect = screen.getByLabelText('Méthode') as HTMLSelectElement
		expect(methodSelect.value).toBe('ALL')
		const statusSelect = screen.getByLabelText('Statut') as HTMLSelectElement
		expect(statusSelect.value).toBe('all')
		expect(screen.getByText(/Page\s+1\s+sur\s+3/i)).toBeInTheDocument()

		// Attendre que le bouton Suivant soit actif (loading faux)
		await waitFor(() => {
			expect(screen.getByRole('button', {name: 'Suivant'})).not.toBeDisabled()
		})

		// Pagination: suivant -> page 2
		const user = userEvent.setup()
		await user.click(screen.getByRole('button', {name: 'Suivant'}))
		await waitFor(() => {
			expect(mockListLogs).toHaveBeenLastCalledWith(expect.objectContaining({
				page: 2,
				pageSize: 8,
			}))
		})
		expect(screen.getByRole('button', {name: 'Précédent'})).not.toBeDisabled()

		// Changer taille de page -> 10 et reset à page 1
		await user.selectOptions(screen.getByLabelText('Taille'), '10')
		await waitFor(() => {
			expect(mockListLogs).toHaveBeenLastCalledWith(expect.objectContaining({
				page: 1,
				pageSize: 10,
			}))
		})

		// Filtrer par méthode GET
		await user.selectOptions(methodSelect, 'GET')
		await waitFor(() => {
			expect(mockListLogs).toHaveBeenLastCalledWith(expect.objectContaining({
				method: 'GET',
				page: 1,
			}))
		})

		// Filtrer par statut 2xx
		await user.selectOptions(statusSelect, '2xx')
		await waitFor(() => {
			expect(mockListLogs).toHaveBeenLastCalledWith(expect.objectContaining({
				statusClass: '2xx',
				page: 1,
			}))
		})

		// Aller à la dernière page et vérifier disabled
		// S'assurer que Suivant est à nouveau actif après les rechargements successifs
		await waitFor(() => {
			expect(screen.getByRole('button', {name: 'Suivant'})).not.toBeDisabled()
		})
		await user.click(screen.getByRole('button', {name: 'Suivant'})) // 2/3
		await waitFor(() => {
			expect(mockListLogs).toHaveBeenLastCalledWith(expect.objectContaining({
				page: 2,
			}))
		})
		await waitFor(() => {
			expect(screen.getByRole('button', {name: 'Suivant'})).not.toBeDisabled()
		})
		await user.click(screen.getByRole('button', {name: 'Suivant'})) // 3/3
		await waitFor(() => {
			expect(mockListLogs).toHaveBeenLastCalledWith(expect.objectContaining({
				page: 3,
			}))
		})
		expect(screen.getByRole('button', {name: 'Suivant'})).toBeDisabled()
	})

	it('affiche 0 logs: table vide, pagination 1/1 et boutons désactivés', async () => {
		// Mock 0 items avec 1 seule page
		mockListLogs = vi.fn(async ({page = 1, pageSize = 8} = {}) => ({
			items: [],
			total: 0,
			page,
			pageSize,
			totalPages: 1,
		}))

		renderWithProviders(<InternalApisWidget />)
		// Attendre que le tableau soit rendu
		const table = await screen.findByRole('table', {name: 'Logs récents'})
		const tbody = table.querySelector('tbody') as HTMLElement
		// Ligne d'état vide accessible
		const emptyStatus = within(tbody).getByRole('status')
		expect(emptyStatus).toBeInTheDocument()
		expect(emptyStatus).toHaveTextContent('Aucun log à afficher')
		expect(emptyStatus).toHaveAttribute('aria-live', 'polite')
		expect(emptyStatus).toHaveAttribute('colspan', '6')
		// 1 ligne (état vide)
		expect(within(tbody).getAllByRole('row')).toHaveLength(1)
		expect(screen.getByText(/Page\s+1\s+sur\s+1/i)).toBeInTheDocument()
		// Boutons pagination désactivés sur 1/1
		expect(screen.getByRole('button', {name: 'Précédent'})).toBeDisabled()
		expect(screen.getByRole('button', {name: 'Suivant'})).toBeDisabled()
	})

	it('désactive les boutons quand totalPages=1 même avec des items', async () => {
		// Utilise le beforeEach par défaut: 2 items et totalPages=1
		renderWithProviders(<InternalApisWidget />)
		// Attendre qu'un log apparaisse pour s'assurer que le chargement est terminé
		await screen.findByText('alice')
		expect(screen.getByText(/Page\s+1\s+sur\s+1/i)).toBeInTheDocument()
		expect(screen.getByRole('button', {name: 'Précédent'})).toBeDisabled()
		expect(screen.getByRole('button', {name: 'Suivant'})).toBeDisabled()
	})

	it('désactive les boutons pendant le chargement puis réactive "Suivant" après chargement; aria-live présent', async () => {
		// Promise différée pour simuler un long chargement avec plusieurs pages
		let resolveLogs!: () => void
		const pending = new Promise<void>(res => { resolveLogs = res })
		mockListLogs = vi.fn(({page = 1, pageSize = 8} = {}) => {
			return pending.then(() => ({
				items: [],
				total: 0,
				page,
				pageSize,
				totalPages: 3,
			}))
		})

		renderWithProviders(<InternalApisWidget />)
		// Pendant le chargement: boutons désactivés
		expect(screen.getByRole('button', {name: 'Précédent'})).toBeDisabled()
		expect(screen.getByRole('button', {name: 'Suivant'})).toBeDisabled()

		// Vérifie aria-live sur la zone d'information
		const para = screen.getByText(/Dernière mise à jour/i)
		expect(para.closest('p')).toHaveAttribute('aria-live', 'polite')

		// Fin du chargement
		resolveLogs()
		await waitFor(() => {
			// Après chargement: Suivant redevient actif (3 pages, page=1)
			expect(screen.getByRole('button', {name: 'Suivant'})).not.toBeDisabled()
			// Précédent reste désactivé en page 1
			expect(screen.getByRole('button', {name: 'Précédent'})).toBeDisabled()
		})
	})
})
