import {renderWithProviders, screen} from '@/test/test-utils'
import {NotificationsFeed} from '@/modules/notifications/NotificationsFeed'
import {axe} from 'jest-axe'

it('affiche le flux de notifications', async () => {
	const {container} = renderWithProviders(<NotificationsFeed />)
	const heading = await screen.findByRole('heading', {level: 2})
	expect(heading).toHaveTextContent('Flux de notifications')
	const items = container.querySelectorAll('ul li')
	expect(items.length).toBeGreaterThan(0)
	const results = await axe(container)
	expect(results).toHaveNoViolations()
})
