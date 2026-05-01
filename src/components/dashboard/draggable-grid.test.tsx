import {renderWithProviders, screen} from '@/test/test-utils'
import {DraggableGrid, type GridItem} from '@/components/dashboard/DraggableGrid'
import {axe} from 'jest-axe'

it('rend les items de la grille', async () => {
	const items: GridItem[] = [
		{id: 'a', content: <div>Un</div>},
		{id: 'b', content: <div>Deux</div>},
	]
	const {container} = renderWithProviders(
		<DraggableGrid items={items} />,
	)
	expect(await screen.findByText('Un')).toBeInTheDocument()
	expect(screen.getByText('Deux')).toBeInTheDocument()
	const results = await axe(container)
	expect(results).toHaveNoViolations()
})
