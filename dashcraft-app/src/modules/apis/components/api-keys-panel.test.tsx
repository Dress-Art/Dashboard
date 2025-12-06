import {renderWithProviders, screen, within} from '@/test/test-utils'
import {ApiKeysPanel} from '@/modules/apis/components/api-keys-panel'
import {axe} from 'jest-axe'
import userEvent from '@testing-library/user-event'
import {vi} from 'vitest'

function seedApiAndKeys() {
	const apis = [
		{id: 'api_1', name: 'API 1'},
		{id: 'api_2', name: 'API 2'},
	]
	const keys = [
		{
			id: 'k1',
			apiId: 'api_1',
			label: 'Alpha',
			key: 'alpha0000000000000000000000000000',
			status: 'active',
			scopes: ['read'],
			createdAt: '2024-01-01T10:00:00.000Z',
			lastUsedAt: '2024-01-02T12:00:00.000Z',
		},
		{
			id: 'k2',
			apiId: 'api_1',
			label: 'Bravo',
			key: 'bravo0000000000000000000000000000',
			status: 'revoked',
			scopes: ['read', 'write'],
			createdAt: '2024-01-02T10:00:00.000Z',
			lastUsedAt: undefined,
		},
		{
			id: 'k3',
			apiId: 'api_1',
			label: 'Charlie',
			key: 'charlie00000000000000000000000000',
			status: 'active',
			scopes: ['admin'],
			createdAt: '2024-01-03T10:00:00.000Z',
			lastUsedAt: '2024-01-03T12:00:00.000Z',
		},
		{
			id: 'k4',
			apiId: 'api_1',
			label: 'Delta',
			key: 'delta000000000000000000000000000',
			status: 'active',
			scopes: ['read', 'admin'],
			createdAt: '2024-01-04T10:00:00.000Z',
			lastUsedAt: undefined,
		},
		{
			id: 'k5',
			apiId: 'api_1',
			label: 'Echo',
			key: 'echo0000000000000000000000000000',
			status: 'revoked',
			scopes: ['write'],
			createdAt: '2024-01-05T10:00:00.000Z',
			lastUsedAt: undefined,
		},
		{
			id: 'k6',
			apiId: 'api_1',
			label: 'Foxtrot',
			key: 'foxtrot00000000000000000000000000',
			status: 'active',
			scopes: ['read', 'write'],
			createdAt: '2024-01-06T10:00:00.000Z',
			lastUsedAt: undefined,
		},
		{
			id: 'k7',
			apiId: 'api_1',
			label: 'Zulu',
			key: 'zulu0000000000000000000000000000',
			status: 'active',
			scopes: ['read'],
			createdAt: '2024-01-07T10:00:00.000Z',
			lastUsedAt: undefined,
		},
		// Bruit pour autre API (ne doit pas apparaître)
		{
			id: 'kX',
			apiId: 'api_2',
			label: 'Other API Key',
			key: 'other000000000000000000000000000',
			status: 'active',
			scopes: ['read'],
			createdAt: '2024-01-08T10:00:00.000Z',
			lastUsedAt: undefined,
		},
	]
	window.localStorage.setItem('dc_apis', JSON.stringify(apis))
	window.localStorage.setItem('dc_api_keys', JSON.stringify(keys))
}

describe('ApiKeysPanel', () => {
	beforeEach(() => {
		window.localStorage.clear()
		seedApiAndKeys()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('rend le panel, la table et est accessible', async () => {
		const {container} = renderWithProviders(
			<ApiKeysPanel open apiId='api_1' apiName='API 1' onClose={() => {}} />,
		)
		const dialog = await screen.findByRole('dialog')
		expect(dialog).toBeInTheDocument()
		await screen.findByRole('heading', {name: /clés api/i})
		const table = await screen.findByRole('table', {name: /clés api/i})
		expect(table).toBeInTheDocument()
		const results = await axe(container)
		expect(results).toHaveNoViolations()
	})

	it('liste initiale et pagination', async () => {
		renderWithProviders(
			<ApiKeysPanel open apiId='api_1' apiName='API 1' onClose={() => {}} />,
		)
		// 7 éléments pour api_1
		await screen.findByText('Zulu')
		const status = await screen.findByRole('status')
		expect(status).toHaveTextContent('7')
		// Passer la taille à 5 et aller page suivante
		const pageSize = await screen.findByLabelText(/taille/i)
		const user = userEvent.setup()
		await user.selectOptions(pageSize, '5')
		const nextBtn = await screen.findByRole('button', {name: /suivant/i})
		await user.click(nextBtn)
		await screen.findByText(/page\s+2\s+sur\s+2/i)
	})

	it('recherche, filtre statut et tri', async () => {
		renderWithProviders(
			<ApiKeysPanel open apiId='api_1' apiName='API 1' onClose={() => {}} />,
		)
		const user = userEvent.setup()
		// Recherche par scope "admin" (doit trouver Charlie et Delta)
		const search = await screen.findByLabelText(/^rechercher$/i)
		await user.clear(search)
		await user.type(search, 'admin')
		// Devrait afficher au moins Charlie
		await screen.findByText('Charlie')
		// Filtrer par Révoquées -> ne doit montrer que les révoquées
		const filter = await screen.findByLabelText(/filtrer par statut/i)
		await user.selectOptions(filter, 'revoked')
		const table = await screen.findByRole('table')
		expect(within(table).queryByText(/^active$/i)).not.toBeInTheDocument()
		// Réinitialiser recherche/filtre avant de tester le tri global
		await user.clear(search)
		await user.selectOptions(filter, 'all')
		// Attendre que la liste complète réapparaisse
		await screen.findByText('Alpha')
		// Tri par libellé ascendant puis descendant
		const sortBy = await screen.findByLabelText(/^champ$/i)
		await user.selectOptions(sortBy, 'label')
		const sortDir = await screen.findByLabelText(/^ordre$/i)
		await user.selectOptions(sortDir, 'asc')
		// En asc, Alpha devrait être en premier
		const firstRowAsc = (await screen.findAllByRole('row'))[1]
		expect(within(firstRowAsc).getByText('Alpha')).toBeInTheDocument()
		await user.selectOptions(sortDir, 'desc')
		const firstRowDesc = (await screen.findAllByRole('row'))[1]
		expect(within(firstRowDesc).getByText('Zulu')).toBeInTheDocument()
	})

	it('création: ajoute une clé et annonce ARIA', async () => {
		renderWithProviders(
			<ApiKeysPanel open apiId='api_1' apiName='API 1' onClose={() => {}} />,
		)
		const user = userEvent.setup()
		const labelInput = await screen.findByLabelText(/libellé/i)
		await user.type(labelInput, 'Nouvelle Clé')
		const scopesInput = await screen.findByLabelText(/périmètres/i)
		await user.clear(scopesInput)
		await user.type(scopesInput, 'read, write')
		await user.click(await screen.findByRole('button', {name: /ajouter/i}))
		// Apparaît dans la table et annonce live
		await screen.findByText('Nouvelle Clé')
		await screen.findByText(/clé créée/i)
	})

	it('copie dans le presse-papiers', async () => {
		renderWithProviders(
			<ApiKeysPanel open apiId='api_1' apiName='API 1' onClose={() => {}} />,
		)
		const user = userEvent.setup()
		// Stub du presse-papiers
		const writeText = vi.fn().mockResolvedValue(undefined)
		Object.defineProperty(window, 'navigator', {
			value: {
				...window.navigator,
				clipboard: {writeText},
			},
			configurable: true,
		})
		// Copier la clé de la première ligne
		const firstCopyBtn = (await screen.findAllByRole('button', {name: /copier/i}))[0]
		const row = firstCopyBtn.closest('tr') as HTMLElement
		const codeEl = row.querySelector('code') as HTMLElement
		await user.click(firstCopyBtn)
		expect(writeText).toHaveBeenCalledWith(codeEl.textContent)
		await screen.findByText(/copié/i)
	})

	it('rotation: régénère la clé et annonce ARIA', async () => {
		renderWithProviders(
			<ApiKeysPanel open apiId='api_1' apiName='API 1' onClose={() => {}} />,
		)
		const user = userEvent.setup()
		// Prendre la ligne Bravo
		const bravoCell = await screen.findByText('Bravo')
		let row = bravoCell.closest('tr') as HTMLElement
		const before = within(row)
			.getByText(/^[a-z0-9]+$/i, {selector: 'code'})
			.textContent
		await user.click(within(row).getByRole('button', {name: /régénérer/i}))
		await screen.findByText(/clé régénérée/i)
		// La ligne peut remonter en tête après rotation -> retrouver par libellé
		row = (await screen.findByText('Bravo')).closest('tr') as HTMLElement
		const after = within(row)
			.getByText(/^[a-z0-9]+$/i, {selector: 'code'})
			.textContent
		expect(after).not.toBe(before)
	})

	it('bascule de statut (activer/révoquer) avec annonce ARIA', async () => {
		renderWithProviders(
			<ApiKeysPanel open apiId='api_1' apiName='API 1' onClose={() => {}} />,
		)
		const user = userEvent.setup()
		// Ligne Alpha (Active)
		const alphaCell = await screen.findByText('Alpha')
		const row = alphaCell.closest('tr') as HTMLElement
		await user.click(within(row).getByRole('button', {name: /modifier/i}))
		await screen.findByText(/clé mise à jour/i)
		await within(row).findByText(/^révoquée$/i)
	})

	it('suppression: retire la ligne et annonce ARIA', async () => {
		renderWithProviders(
			<ApiKeysPanel open apiId='api_1' apiName='API 1' onClose={() => {}} />,
		)
		const user = userEvent.setup()
		const zuluCell = await screen.findByText('Zulu')
		const row = zuluCell.closest('tr') as HTMLElement
		await user.click(within(row).getByRole('button', {name: /supprimer/i}))
		expect(screen.queryByText('Zulu')).not.toBeInTheDocument()
		await screen.findByText(/clé supprimée/i)
	})

	it('fermeture via overlay et Escape appelle onClose', async () => {
		const onClose = vi.fn()
		renderWithProviders(
			<ApiKeysPanel open apiId='api_1' apiName='API 1' onClose={onClose} />,
		)
		const user = userEvent.setup()
		// Clic overlay (aria-hidden)
		const overlay = document.querySelector('[aria-hidden="true"]') as HTMLElement
		expect(overlay).toBeTruthy()
		await user.click(overlay)
		expect(onClose).toHaveBeenCalled()
		// Escape
		await user.keyboard('{Escape}')
		expect(onClose).toHaveBeenCalledTimes(2)
	})
})
