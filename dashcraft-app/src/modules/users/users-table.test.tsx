import {renderWithProviders, screen} from '@/test/test-utils'
import {UsersTable} from '@/modules/users/UsersTable'
import {axe} from 'jest-axe'

it('affiche la table utilisateurs et 8 lignes', async () => {
	const {container} = renderWithProviders(<UsersTable />)
	const table = await screen.findByRole('table')
	expect(table).toBeInTheDocument()
	const rows = container.querySelectorAll('tbody tr')
	expect(rows.length).toBe(8)
	const results = await axe(container)
	expect(results).toHaveNoViolations()
})
