import {type ReactNode} from 'react'
import {cn} from '@/lib/utils'

/**
 * WidgetCard
 * Carte standardisée pour tous les widgets.
 */
export interface WidgetCardProps {
	title: ReactNode
	id?: string
	className?: string
	children: ReactNode
}

export function WidgetCard({title, id, className, children}: WidgetCardProps) {
	return (
		<section
			id={id}
			className={cn(
				'rounded-lg border border-white/10 bg-white/5 p-4',
				'shadow-sm shadow-black/10',
				className,
			)}
			aria-labelledby={id ? `${id}-title` : undefined}
		>
			<header className='mb-4'>
				<h2 id={id ? `${id}-title` : undefined} className='text-sm font-medium'>
					{title}
				</h2>
			</header>
			<div>{children}</div>
		</section>
	)
}
