/* eslint-env jest */
import {renderWithProviders, screen} from '@/test/test-utils'
import {AnalyticsWidget} from '@/modules/analytics/AnalyticsWidget'
import {axe} from 'jest-axe'

it('rend le widget analytics avec un graphique mocké', async () => {
	const {container} = renderWithProviders(<AnalyticsWidget />)
	const title = await screen.findByRole('heading', {level: 2})
	expect(title).toHaveTextContent('Trafic & Conversions')
	// Le composant Line est mocké en <div data-testid="chart" />
	expect(container.querySelector('[data-testid="chart"]')).toBeInTheDocument()
	const results = await axe(container)
	expect(results).toHaveNoViolations()
})
