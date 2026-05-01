import React from 'react'
import {renderWithProviders, screen} from '@/test/test-utils'
import {PaymentsPage} from '@/modules/payments/PaymentsPage'
import {axe} from 'jest-axe'
import userEvent from '@testing-library/user-event'
import {vi} from 'vitest'

async function blobToText (b: Blob): Promise<string> {
    if (b && typeof b.text === 'function') {
        return await b.text()
    }
    if (b && typeof b.arrayBuffer === 'function') {
        const ab = await b.arrayBuffer()
        return new TextDecoder().decode(ab)
    }
    return await new Promise<string>((resolve, reject) => {
        try {
            const fr = new FileReader()
            fr.onload = () => resolve(String(fr.result || ''))
            fr.onerror = () => reject(fr.error)
            fr.readAsText(b)
        } catch (e) {
            reject(e as Error)
        }
    })
}

/**
 * Tests d'intégration pour PaymentsPage
 * - Rendu + accessibilité
 * - Création d'un paiement
 * - Recherche filtrante (Aucun résultat)
 * - Pagination basique (Page 1 -> Page 2)
 */
describe('PaymentsPage', () => {
	beforeEach(() => {
		window.localStorage.clear()
	})

	it('rend la page et est accessible', async () => {
		const {container} = renderWithProviders(<PaymentsPage />)
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

	it("permet de créer un paiement et de l'afficher dans la liste", async () => {
		renderWithProviders(<PaymentsPage />)
		const user = userEvent.setup()
		// Remplir le formulaire
		const customerInput = await screen.findByLabelText(/client/i)
		expect(customerInput).toBeInTheDocument()
		await user.type(customerInput, 'Client Test')
		const amountInput = await screen.findByLabelText(/montant/i)
		await user.clear(amountInput)
		await user.type(amountInput, '123.45')
		const submitBtn = await screen.findByRole('button', {name: /ajouter/i})
		await user.click(submitBtn)
		// Attendre l'apparition du client créé
		const created = await screen.findByText('Client Test')
		expect(created).toBeInTheDocument()
	})

	it('filtre par recherche et affiche "Aucun résultat" pour une requête inédite', async () => {
		renderWithProviders(<PaymentsPage />)
		const user = userEvent.setup()
		const searchbox = await screen.findByRole('searchbox')
		await user.clear(searchbox)
		await user.type(searchbox, 'zz__aucun_match__zz')
		const empty = await screen.findByText(/aucun résultat/i)
		expect(empty).toBeInTheDocument()
	})

	it('gère la pagination (aller à la page suivante)', async () => {
		renderWithProviders(<PaymentsPage />)
		const user = userEvent.setup()
		// Texte de page initiale
		const pageInfo1 = await screen.findByText(/page\s*1\s*sur/i)
		expect(pageInfo1).toBeInTheDocument()
		// Aller à la page suivante
		const nextBtn = await screen.findByRole('button', {name: /suivant/i})
		await user.click(nextBtn)
		const pageInfo2 = await screen.findByText(/page\s*2\s*sur/i)
		expect(pageInfo2).toBeInTheDocument()
	})

	it('tri par montant asc/desc avec aria-sort', async () => {
		renderWithProviders(<PaymentsPage />)
		const user = userEvent.setup()
		// Choisir tri par Montant
		const sortBy = await screen.findByLabelText(/champ|field/i)
		await user.selectOptions(sortBy, 'amount')
		const sortDir = await screen.findByLabelText(/ordre|order/i)
		await user.selectOptions(sortDir, 'asc')
		const amountHeader = await screen.findByRole('columnheader', {
			name: /montant|amount/i,
		})
		expect(amountHeader).toHaveAttribute('aria-sort', 'ascending')
		const table = await screen.findByRole('table')
		const ascVals = Array.from(
			(table as HTMLElement).querySelectorAll<HTMLTableCellElement>('td[data-amount]'),
		).map(td => parseFloat(td.getAttribute('data-amount') || '0'))
		expect(ascVals.every((v, i, a) => i === 0 || a[i - 1] <= v)).toBe(true)
		await user.selectOptions(sortDir, 'desc')
		expect(amountHeader).toHaveAttribute('aria-sort', 'descending')
		const descVals = Array.from(
			(table as HTMLElement).querySelectorAll<HTMLTableCellElement>('td[data-amount]'),
		).map(td => parseFloat(td.getAttribute('data-amount') || '0'))
		expect(descVals.every((v, i, a) => i === 0 || a[i - 1] >= v)).toBe(true)
	})

	it('tri par date asc/desc avec aria-sort', async () => {
		renderWithProviders(<PaymentsPage />)
		const user = userEvent.setup()
		const sortBy = await screen.findByLabelText(/champ|field/i)
		await user.selectOptions(sortBy, 'time')
		const sortDir = await screen.findByLabelText(/ordre|order/i)
		await user.selectOptions(sortDir, 'asc')
		const timeHeader = await screen.findByRole('columnheader', {
			name: /heure|time/i,
		})
		expect(timeHeader).toHaveAttribute('aria-sort', 'ascending')
		const table = await screen.findByRole('table')
		const ascTimes = Array.from(
			(table as HTMLElement).querySelectorAll<HTMLTableCellElement>('td[data-time]'),
		).map(td => Date.parse(td.getAttribute('data-time') || '0'))
		expect(ascTimes.every((v, i, a) => i === 0 || a[i - 1] <= v)).toBe(true)
		await user.selectOptions(sortDir, 'desc')
		expect(timeHeader).toHaveAttribute('aria-sort', 'descending')
		const descTimes = Array.from(
			(table as HTMLElement).querySelectorAll<HTMLTableCellElement>('td[data-time]'),
		).map(td => Date.parse(td.getAttribute('data-time') || '0'))
		expect(descTimes.every((v, i, a) => i === 0 || a[i - 1] >= v)).toBe(true)
	})

	it('export CSV génère un fichier avec en-tête et échappement correct', async () => {
		const urlSpy = vi.spyOn(URL, 'createObjectURL')
		let captured: Blob | null = null
		urlSpy.mockImplementation((b: Blob) => {
			captured = b as Blob
			return 'blob:mock'
		})
		const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
		revokeSpy.mockImplementation(() => {})
        // Empêcher la navigation jsdom lors du clic sur l’ancre de téléchargement
        const anchorClickSpy = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => {})

		renderWithProviders(<PaymentsPage />)
		const user = userEvent.setup()
		// Créer un paiement avec caractères spéciaux
		const customerInput = await screen.findByLabelText(/client|customer/i)
		await user.type(customerInput, 'ACME, Inc. "VIP"')
		const amountInput = await screen.findByLabelText(/montant|amount/i)
		await user.clear(amountInput)
		await user.type(amountInput, '12.34')
		const addBtn = await screen.findByRole('button', {name: /ajouter|add/i})
		await user.click(addBtn)
		// Exporter CSV
		const exportBtn = await screen.findByRole('button', {name: /export/i})
		await user.click(exportBtn)
		expect(captured).not.toBeNull()
		if (!captured) throw new Error('Blob non capturé')
		const text = await blobToText(captured)
		const firstLine = text.split('\n')[0]
		expect(firstLine).toBe('customer,amount,currency,status,time')
		// Échappement: guillemets doublés et champ quoté
		expect(text).toContain('"ACME, Inc. ""VIP"""')
		expect(text).toContain('12.34')

		urlSpy.mockRestore()
		revokeSpy.mockRestore()
		anchorClickSpy.mockRestore()
	})

	it('suppression multiple avec confirmation', async () => {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
		renderWithProviders(<PaymentsPage />)
		const user = userEvent.setup()
		const table = await screen.findByRole('table')
		const rows = Array.from(
			(table as HTMLElement).querySelectorAll<HTMLTableRowElement>('tbody tr'),
		)
		// Sélectionner deux lignes si disponibles
		const first = rows[0]!
		const second = rows[1]!
		const firstName = first
			.querySelector('td:nth-child(2)')?.textContent?.trim() || ''
		const secondName = second
			.querySelector('td:nth-child(2)')?.textContent?.trim() || ''
		const firstCb = first.querySelector<HTMLInputElement>('input[type="checkbox"]') as HTMLInputElement
		const secondCb = second.querySelector<HTMLInputElement>('input[type="checkbox"]') as HTMLInputElement
		await user.click(firstCb)
		await user.click(secondCb)
		// Toolbar actions groupées visible
		const bulkBar = await screen.findByRole('region', { name: /actions groupées|bulk actions/i })
		expect(bulkBar).toBeInTheDocument()
		const delBtn = await screen.findByRole('button', {
			name: /supprimer la sélection|delete selected/i,
		})
		await user.click(delBtn)
		expect(confirmSpy).toHaveBeenCalled()
		// Lignes supprimées
		if (firstName) {
			expect(screen.queryByText(firstName)).not.toBeInTheDocument()
		}
		if (secondName) {
			expect(screen.queryByText(secondName)).not.toBeInTheDocument()
		}
		confirmSpy.mockRestore()
	})
})
