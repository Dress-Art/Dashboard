import React from 'react'
import {renderWithProviders, screen, waitFor} from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import {describe, it, expect, beforeEach, vi} from 'vitest'
import {MonitoringWidget} from '@/modules/monitoring/MonitoringWidget'
import type {MonitoringMetrics} from '@/lib/useApi'

/**
 * Tests pour MonitoringWidget
 * - Mock de useApi().monitoring.get / refresh
 * - Vérifie le rendu initial des métriques
 * - Vérifie l'actualisation via le bouton Rafraîchir
 */
let mockGet: () => Promise<MonitoringMetrics>
let mockRefresh: () => Promise<MonitoringMetrics>

vi.mock('@/lib/useApi', () => {
	return {
		useApi: () => ({
			monitoring: {
				get: () => mockGet(),
				refresh: () => mockRefresh(),
			},
		}),
	}
})

describe('MonitoringWidget', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		window.localStorage.clear()
		mockGet = vi.fn(async () => ({
			cpu: 42,
			memoryMb: 1024,
			updatedAt: new Date().toISOString(),
		}))
		mockRefresh = vi.fn(async () => ({
			cpu: 55,
			memoryMb: 2048,
			updatedAt: new Date().toISOString(),
		}))
	})

	it("affiche et met à jour 'Dernière mise à jour' après rafraîchissement", async () => {
		renderWithProviders(<MonitoringWidget />)
		// Attendre le rendu initial
		await screen.findByText(/42\s*%/)
		const para = screen.getByText(/Dernière mise à jour/i)
		const initialText = para.textContent
		// Forcer une nouvelle valeur d'updatedAt suffisamment différente ( +1 min )
		mockRefresh = vi.fn(async () => ({
			cpu: 55,
			memoryMb: 2048,
			updatedAt: new Date(Date.now() + 60_000).toISOString(),
		}))
		const user = userEvent.setup()
		await user.click(screen.getByRole('button', {name: /rafraîchir/i}))
		await waitFor(() => {
			expect(mockRefresh).toHaveBeenCalledTimes(1)
			const paraAfter = screen.getByText(/Dernière mise à jour/i)
			expect(paraAfter.textContent).not.toBe(initialText)
		})
	})

	it('affiche les métriques initiales (CPU et Mémoire)', async () => {
		renderWithProviders(<MonitoringWidget />)
		// CPU (tolérant aux espaces)
		await screen.findByText(/42\s*%/)
		// Mémoire (FR par défaut: Mo)
		expect(screen.getByText(/1024\s+Mo/i)).toBeInTheDocument()
	})

	it('affiche le temps relatif entre parenthèses (FR ou EN)', async () => {
		renderWithProviders(<MonitoringWidget />)
		await screen.findByText(/42\s*%/)
		const para = screen.getByText(/Dernière mise à jour/i)
		// Doit contenir des parenthèses avec soit "il y a ..." (FR) soit "... ago" (EN)
		expect(para).toHaveTextContent(/\((il y a .*?|.* ago)\)/i)
	})

	it('rafraîchit les métriques au clic sur le bouton', async () => {
		renderWithProviders(<MonitoringWidget />)
		// Attendre le rendu initial
		await screen.findByText(/42\s*%/)

		const user = userEvent.setup()
		await user.click(screen.getByRole('button', {name: /rafraîchir/i}))

		// Vérifier que l'API de refresh a été appelée
		expect(mockRefresh).toHaveBeenCalledTimes(1)

		// Nouvelles métriques affichées (vérifier par conteneur pour éviter les
		// soucis de noeuds texte fragmentés)
		await waitFor(() => {
			const cpuLabel = screen.getByText('CPU')
			// parent <div> qui contient le label + valeur
			expect(cpuLabel.parentElement).toHaveTextContent(/55\s*%/)
			const memLabel = screen.getByText('Mémoire')
			expect(memLabel.parentElement).toHaveTextContent(/2048\s+Mo/i)
		})
	})
})
