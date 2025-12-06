'use client'

import dynamic from 'next/dynamic'
import type {DraggableGridProps} from './DraggableGrid'

/**
 * DraggableGridClient
 * Wrapper client-only autour de DraggableGrid.
 * Utilise un import dynamique avec ssr:false pour éviter
 * les mismatches d'hydratation liés à dnd-kit côté serveur.
 */
const DraggableGrid = dynamic(
	() => import('./DraggableGrid').then(m => m.DraggableGrid),
	{ssr: false},
)

export function DraggableGridClient(props: DraggableGridProps) {
	return <DraggableGrid {...props} />
}
