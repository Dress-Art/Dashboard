import {renderWithProviders} from '@/test/test-utils'
import {Icon} from '@/lib/icons'
import {axe} from 'jest-axe'

it('rend une icône SVG', async () => {
	const {container} = renderWithProviders(<Icon name='settings' />)
	const svg = container.querySelector('svg')
	expect(svg).toBeInTheDocument()
	const results = await axe(container)
	expect(results).toHaveNoViolations()
})
