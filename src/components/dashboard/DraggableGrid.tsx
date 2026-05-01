'use client'

import {useState, useEffect, type ReactNode} from 'react'
import {
	DndContext,
	closestCenter,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent,
} from '@dnd-kit/core'
import {
	SortableContext,
	rectSortingStrategy,
	arrayMove,
} from '@dnd-kit/sortable'
import {SortableItem} from './SortableItem'
import {cn} from '@/lib/utils'

export interface GridItem {
	id: string
	content: ReactNode
}

export interface DraggableGridProps {
	items: GridItem[]
	className?: string
}

/**
 * DraggableGrid
 * Grille drag-and-drop simple utilisant dnd-kit.
 */
export function DraggableGrid({items: initialItems, className}: DraggableGridProps) {
	const [items, setItems] = useState<GridItem[]>(initialItems)
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setItems(initialItems)
	}, [initialItems])

	useEffect(() => {
		setMounted(true)
	}, [])

	const sensors = useSensors(useSensor(PointerSensor))

	// Évite les divergences server/client (SSR) avec dnd-kit et données mock
	if (!mounted) return null

	function handleDragEnd(event: DragEndEvent) {
		const {active, over} = event
		if (!over || active.id === over.id) return
		const oldIndex = items.findIndex(i => i.id === active.id)
		const newIndex = items.findIndex(i => i.id === over.id)
		setItems(arrayMove(items, oldIndex, newIndex))
	}

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
				<div className={cn('grid gap-4 md:grid-cols-2 xl:grid-cols-3', className)}>
					{items.map(item => (
						<SortableItem key={item.id} id={item.id}>
							{item.content}
						</SortableItem>
					))}
				</div>
			</SortableContext>
		</DndContext>
	)
}
