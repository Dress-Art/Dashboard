import React from 'react'
import {renderWithProviders, screen} from '@/test/test-utils'
import {CalendarPage} from '@/modules/calendar/CalendarPage'
import {vi} from 'vitest'
import {axe} from 'jest-axe'
import type {EventEntity, Paginated} from '@/lib/useApi'

/**
 * Tests d'intégration pour CalendarPage
 * - Rendu + accessibilité
 * - États du widget: chargement, succès, vide, erreur
 */
type ListEventsParams = {
	page?: number
	pageSize?: number
	q?: string
	dateFrom?: string
	dateTo?: string
	order?: 'asc' | 'desc'
}
type EventsListResult = Paginated<EventEntity>

let mockList: (params?: ListEventsParams) => Promise<EventsListResult>

vi.mock('@/lib/useApi', () => {
	return {
		useApi: () => ({
			events: {
				list: (params?: ListEventsParams) => mockList(params),
			},
		}),
	}
})

describe('CalendarPage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		window.localStorage.clear()
		mockList = async (_params?: ListEventsParams) => {
			void _params
			return {
				items: [],
				total: 0,
				page: 1,
				pageSize: 5,
				totalPages: 1,
			}
		}
	})

	it('rend la page et est accessible', async () => {
		const {container} = renderWithProviders(<CalendarPage />)
		// Titre principal
		const h1 = await screen.findByRole('heading', {level: 1})
		expect(h1).toBeInTheDocument()
		// Widget Calendrier présent (titre du widget niveau 2)
		const widgetHeading = await screen.findByRole('heading', {level: 2, name: /calendrier/i})
		expect(widgetHeading).toBeInTheDocument()
		// Attendre la stabilisation du widget (chargement terminé)
		await screen.findByText(/aucun résultat/i)
		// Axe a11y après stabilisation
		const results = await axe(container)
		expect(results).toHaveNoViolations()
	})

	it('affiche le chargement puis les événements', async () => {
		let resolveFn: (v: EventsListResult) => void
		const p = new Promise<EventsListResult>(r => {
			resolveFn = r
		})
		mockList = vi.fn(() => p)

		renderWithProviders(<CalendarPage />)

		// Chargement visible dans le widget
		const status = screen.getByRole('status')
		expect(status).toHaveTextContent(/chargement/i)

		// Résoudre la promesse avec 2 événements
		resolveFn!({
			items: [
				{id: '1', title: 'Réunion produit', time: '2025-08-16T09:00:00.000Z'},
				{id: '2', title: 'Point sprint', time: '2025-08-16T13:00:00.000Z'},
			],
			total: 2,
			page: 1,
			pageSize: 5,
			totalPages: 1,
		})

		const first = await screen.findByText('Réunion produit')
		expect(first).toBeInTheDocument()
		const dateFragments = screen.getAllByText(/2025-08-16/)
		expect(dateFragments.length).toBeGreaterThan(0)
	})

	it("affiche l'état d'erreur si l'API échoue", async () => {
		mockList = vi.fn(async () => {
			throw new Error('Boom')
		})

		renderWithProviders(<CalendarPage />)
		const alert = await screen.findByRole('alert')
		expect(alert).toHaveTextContent(/erreur/i)
	})

	it('affiche Aucun résultat quand la liste est vide', async () => {
		mockList = vi.fn(async () => ({
			items: [],
			total: 0,
			page: 1,
			pageSize: 5,
			totalPages: 1,
		}))

		renderWithProviders(<CalendarPage />)
		const empty = await screen.findByText(/aucun résultat/i)
		expect(empty).toBeInTheDocument()
	})
})
