'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations} from 'next-intl'
import {faker} from '@faker-js/faker'

interface FeedbackItem {
	id: string
	rating: number
	comment: string
}

/**
 * FeedbacksWidget
 * Liste de feedbacks mockée (notes + commentaires) avec données déterministes.
 */
export function FeedbacksWidget() {
	const t = useTranslations('widgets.feedbacks')
	faker.seed(42)
	const items: FeedbackItem[] = Array.from({length: 5}).map(() => ({
		id: faker.string.uuid(),
		rating: faker.number.int({min: 1, max: 5}),
		comment: faker.lorem.sentence({min: 6, max: 12}),
	}))
	return (
		<WidgetCard id='module-feedbacks' title={t('title')}>
			<ul role='list' className='space-y-3'>
				{items.map(f => (
					<li key={f.id} role='listitem' className='rounded-md bg-white/5 p-4'>
						<p className='text-xs text-white/70'>{t('rating')}: {f.rating}/5</p>
						<p className='text-sm'>{t('comment')}: {f.comment}</p>
					</li>
				))}
			</ul>
		</WidgetCard>
	)
}
