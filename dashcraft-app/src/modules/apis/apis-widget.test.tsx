import React from 'react'
import {renderWithProviders, screen, within, waitFor} from '@/test/test-utils'
import {describe, it, expect, beforeEach, vi} from 'vitest'
import {ApisWidget} from '@/modules/apis/ApisWidget'
import type {ApiEntity} from '@/lib/useApi'

let mockList: (params?: {
	page?: number
	pageSize?: number
	status?: 'all' | 'up' | 'down'
	sortBy?: 'lastChecked' | 'name' | 'latency'
	sortDir?: 'asc' | 'desc'
}) => Promise<{items: Array<Pick<ApiEntity, 'id' | 'name' | 'status'>>; total: number; page: number; pageSize: number; totalPages: number}>

vi.mock('@/lib/useApi', () => {
	return {
		useApi: () => ({
			apis: {
				list: (params?: {
					page?: number
					pageSize?: number
					status?: 'all' | 'up' | 'down'
					sortBy?: 'lastChecked' | 'name' | 'latency'
					sortDir?: 'asc' | 'desc'
				}) => mockList(params),
			},
		}),
	}
})

describe('ApisWidget - debug states', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		window.localStorage.clear()
		window.history.replaceState(null, '', '/')
		mockList = vi.fn(async ({page = 1, pageSize = 4} = {}) => ({
			items: [],
			total: 0,
			page,
			pageSize,
			totalPages: 1,
		}))
	})

	it('force loading via localStorage: aria-busy true et message localisé', async () => {
		window.localStorage.setItem('dashcraft.apisWidget.debug', 'loading')
		renderWithProviders(<ApisWidget />)

		const table = screen.getByRole('table', {name: 'APIs externes'})
		await waitFor(() => {
			expect(table).toHaveAttribute('aria-busy', 'true')
		})
		const tbody = table.querySelector('tbody') as HTMLElement
		const statusCell = within(tbody).getByRole('status')
		expect(statusCell).toBeInTheDocument()
		expect(statusCell).toHaveAttribute('aria-live', 'polite')
		expect(statusCell).toHaveAttribute('colspan', '2')
		await waitFor(() => {
			expect(statusCell).toHaveTextContent('Chargement...')
		})
		expect(mockList).not.toHaveBeenCalled()
	})

	it('force error via localStorage: aria-busy false et message localisé', async () => {
		window.localStorage.setItem('dashcraft.apisWidget.debug', 'error')
		renderWithProviders(<ApisWidget />)

		const table = screen.getByRole('table', {name: 'APIs externes'})
		await waitFor(() => {
			expect(table).toHaveAttribute('aria-busy', 'false')
		})
		const tbody = table.querySelector('tbody') as HTMLElement
		const statusCell = within(tbody).getByRole('status')
		expect(statusCell).toBeInTheDocument()
		expect(statusCell).toHaveAttribute('aria-live', 'polite')
		expect(statusCell).toHaveAttribute('colspan', '2')
		await waitFor(() => {
			expect(statusCell).toHaveTextContent('Erreur')
		})
		expect(mockList).not.toHaveBeenCalled()
	})

	it('force empty via localStorage: aria-busy false et message localisé', async () => {
		window.localStorage.setItem('dashcraft.apisWidget.debug', 'empty')
		renderWithProviders(<ApisWidget />)

		const table = screen.getByRole('table', {name: 'APIs externes'})
		await waitFor(() => {
			expect(table).toHaveAttribute('aria-busy', 'false')
		})
		const tbody = table.querySelector('tbody') as HTMLElement
		const statusCell = within(tbody).getByRole('status')
		expect(statusCell).toBeInTheDocument()
		expect(statusCell).toHaveAttribute('aria-live', 'polite')
		expect(statusCell).toHaveAttribute('colspan', '2')
		await waitFor(() => {
			expect(statusCell).toHaveTextContent('Aucun résultat')
		})
		expect(mockList).not.toHaveBeenCalled()
	})

	it('active debug via querystring (?apisDebug=error)', async () => {
		window.history.replaceState(null, '', '/?apisDebug=error')
		renderWithProviders(<ApisWidget />)
		const table = screen.getByRole('table', {name: 'APIs externes'})
		await waitFor(() => {
			expect(table).toHaveAttribute('aria-busy', 'false')
		})
		const tbody = table.querySelector('tbody') as HTMLElement
		const statusCell = within(tbody).getByRole('status')
		await waitFor(() => {
			expect(statusCell).toHaveTextContent('Erreur')
		})
		expect(mockList).not.toHaveBeenCalled()
	})

	it('chemin normal sans debug: appelle l\'API et affiche des services', async () => {
		mockList = vi.fn(async () => ({
			items: [
				{id: 'a', name: 'Stripe', status: 'up'},
				{id: 'b', name: 'Github', status: 'down'},
			],
			total: 2,
			page: 1,
			pageSize: 4,
			totalPages: 1,
		}))
		renderWithProviders(<ApisWidget />)
		// L'appel API est effectué
		await waitFor(() => {
			expect(mockList).toHaveBeenCalledTimes(1)
		})
		// Les services sont rendus avec libellés de statut
		expect(await screen.findByText('Stripe')).toBeInTheDocument()
		expect(await screen.findByText('Github')).toBeInTheDocument()
		// Vérifie au moins la présence de OK / En panne (i18n)
		expect(screen.getAllByText('OK').length).toBeGreaterThan(0)
		expect(screen.getAllByText('En panne').length).toBeGreaterThan(0)
	})
})
