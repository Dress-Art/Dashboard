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
				'rounded-lg bg-white dark:bg-black p-6',
				'shadow-md',
				className,
			)}
			aria-labelledby={id ? `${id}-title` : undefined}
		>
			<header className='mb-4'>
				<h2 id={id ? `${id}-title` : undefined} className='text-sm font-semibold text-black dark:text-white'>
					{title}
				</h2>
			</header>
			<div className='text-black dark:text-white'>{children}</div>
		</section>
	)
}
