import {vi} from 'vitest'
import {renderWithProviders, screen} from '@/test/test-utils'
import {Topbar} from '@/components/layout/Topbar'
import {axe} from 'jest-axe'
import {getLocaleDisplayName} from '@/config/i18n'

// Mock du App Router de Next pour éviter l'invariant en test
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		refresh: vi.fn(),
	}),
}))

it('rend boutons langue et toggle thème', async () => {
	const {container} = renderWithProviders(<Topbar />)
	const themeBtn = await screen.findByRole('button', {
		name: 'Basculer le thème',
	})
	expect(themeBtn).toBeInTheDocument()
	expect(
		screen.getByRole('button', {name: getLocaleDisplayName('fr')}),
	).toBeInTheDocument()
	expect(
		screen.getByRole('button', {name: getLocaleDisplayName('en')}),
	).toBeInTheDocument()
	const results = await axe(container)
	expect(results).toHaveNoViolations()
})
