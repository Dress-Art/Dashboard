'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations} from 'next-intl'
import {faker} from '@faker-js/faker'

interface Item {
	id: string
	title: string
	time: string
}

function makeItems(count = 6): Item[] {
	// Seed pour stabilité SSR/CSR
	faker.seed(42)
	return Array.from({length: count}).map(() => ({
		id: faker.string.uuid(),
		title: faker.lorem.sentence({min: 3, max: 7}),
		// Utiliser ISO pour éviter les différences de fuseau/locale
		time: faker.date.recent({days: 5}).toISOString(),
	}))
}

/**
 * NotificationsFeed
 * Fil de notifications mocké.
 */
export function NotificationsFeed() {
	const t = useTranslations('widgets.notifications')
	const items = makeItems()
	return (
		<WidgetCard id='module-notifications' title={t('title')}>
			<ul className='space-y-3'>
				{items.map(i => (
					<li key={i.id} className='rounded-md bg-white/5 p-3'>
						<p className='text-sm'>{i.title}</p>
						<p className='text-xs text-white/60'>{i.time}</p>
					</li>
				))}
			</ul>
		</WidgetCard>
	)
}
