import React from 'react'
import {renderWithProviders, screen} from '@/test/test-utils'
import {CalendarWidget} from '@/modules/calendar/CalendarWidget'
import {describe, it, expect, beforeEach, vi} from 'vitest'
import type {EventEntity, Paginated} from '@/lib/useApi'

/**
 * Tests pour CalendarWidget
 * - Mock de useApi().events.list
 * - États: chargement, erreur, vide
 * - Rendu des items
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

describe('CalendarWidget', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		window.localStorage.clear()
		mockList = async () => ({
			items: [],
			total: 0,
			page: 1,
			pageSize: 5,
			totalPages: 1,
		})
	})

	it('affiche le chargement puis les événements', async () => {
		let resolveFn: (v: EventsListResult) => void
		const p = new Promise<EventsListResult>(r => {
			resolveFn = r
		})
		mockList = vi.fn(() => p)

		renderWithProviders(<CalendarWidget pageSize={5} />)

		// Chargement visible
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

		// Les éléments apparaissent
		const first = await screen.findByText('Réunion produit')
		expect(first).toBeInTheDocument()
		// Date formatée (partielle pour éviter les soucis de fuseau horaire)
		const dateFragments = screen.getAllByText(/2025-08-16/)
		expect(dateFragments.length).toBeGreaterThan(0)
	})

	it("affiche l'état d'erreur si l'API échoue", async () => {
		mockList = vi.fn(async () => {
			throw new Error('Boom')
		})

		renderWithProviders(<CalendarWidget />)
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

		renderWithProviders(<CalendarWidget />)
		const empty = await screen.findByText(/aucun résultat/i)
		expect(empty).toBeInTheDocument()
	})

	it('recharge les données quand refreshKey change', async () => {
		// 1. Premier lot d'items
		let resolve1: (v: EventsListResult) => void
		const p1 = new Promise<EventsListResult>(r => {
			resolve1 = r
		})
		mockList = vi.fn(() => p1)

		const {rerender} = renderWithProviders(
			<CalendarWidget pageSize={5} refreshKey={0} />,
		)

		// Toujours afficher un état de chargement au départ
		await screen.findByRole('status')

		// Résoudre premier lot
		resolve1!({
			items: [
				{id: 'a1', title: 'Lot A - 1', time: '2025-08-16T09:00:00.000Z'},
			],
			total: 1,
			page: 1,
			pageSize: 5,
			totalPages: 1,
		})

		// L'item du lot A apparaît
		await screen.findByText('Lot A - 1')

		// 2. Deuxième lot d'items, nouveau mock et nouveau refreshKey
		let resolve2: (v: EventsListResult) => void
		const p2 = new Promise<EventsListResult>(r => {
			resolve2 = r
		})
		mockList = vi.fn(() => p2)

		rerender(<CalendarWidget pageSize={5} refreshKey={1} />)

		// Affichage d'un nouvel état de chargement
		await screen.findByRole('status')

		// Résoudre deuxième lot
		resolve2!({
			items: [
				{id: 'b1', title: 'Lot B - 1', time: '2025-08-17T10:00:00.000Z'},
			],
			total: 1,
			page: 1,
			pageSize: 5,
			totalPages: 1,
		})

		// Le nouvel item apparaît et l'ancien n'est plus présent
		await screen.findByText('Lot B - 1')
		expect(screen.queryByText('Lot A - 1')).toBeNull()
	})
})
