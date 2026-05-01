/* eslint-env jest */
import {renderWithProviders, screen, within} from '@/test/test-utils'
import {SourcesBreakdownWidget} from '@/modules/analytics/SourcesBreakdownWidget'
import {axe} from 'jest-axe'
import userEvent from '@testing-library/user-event'
import enMessages from '@/messages/en.json'
import frMessages from '@/messages/fr.json'
import type {AbstractIntlMessages} from 'next-intl'

it('rend le widget sources breakdown avec un donut mocké et une légende', async () => {
	const {container} = renderWithProviders(<SourcesBreakdownWidget />, {
		locale: 'fr',
		messages: frMessages as AbstractIntlMessages,
	})
	const title = await screen.findByRole('heading', {level: 2})
	expect(title).toHaveTextContent('Répartition des sources')
	// Le composant Doughnut est mocké en <div data-testid="doughnut-chart" />
	expect(container.querySelector('[data-testid="doughnut-chart"]')).toBeInTheDocument()
	// Légende et Total
	expect(screen.getByText('Légende')).toBeInTheDocument()
	expect(screen.getByText(/Total/)).toBeInTheDocument()
	// Au moins un item de légende présent
	const list = screen.getByRole('list', {name: 'Légende'})
	const items = within(list).getAllByRole('listitem')
	expect(items.length).toBeGreaterThan(0)
	const results = await axe(container)
	expect(results).toHaveNoViolations()
})

it('supporte i18n en', async () => {
	const {container} = renderWithProviders(<SourcesBreakdownWidget />, {
		locale: 'en',
		messages: enMessages as AbstractIntlMessages,
	})
	const title = await screen.findByRole('heading', {level: 2})
	expect(title).toHaveTextContent('Sources breakdown')
	expect(screen.getByText('Legend')).toBeInTheDocument()
	expect(screen.getByText(/Total/)).toBeInTheDocument()
	const results = await axe(container)
	expect(results).toHaveNoViolations()
})

it('rafraîchit les données et met à jour updatedAt', async () => {
	const {container} = renderWithProviders(<SourcesBreakdownWidget />)
	const updatedLabel = await screen.findByText('Dernière mise à jour', {exact: false})
	const wrapper = updatedLabel.closest('p') as HTMLElement
	const before = wrapper.textContent
	const button = screen.getByRole('button', {name: 'Rafraîchir'})
	await userEvent.click(button)
	// Attendre que le texte change
	await screen.findByText((content, element) => {
		return (
			element?.tagName.toLowerCase() === 'p' &&
			content.includes('Dernière mise à jour') &&
			content !== before
		)
	})
	const results = await axe(container)
	expect(results).toHaveNoViolations()
})
