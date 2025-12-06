'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations} from 'next-intl'
import {faker} from '@faker-js/faker'

interface ChatThread {
	id: string
	title: string
	participants: number
}

/**
 * ChatsWidget
 * Aperçu des conversations (threads) mockées, données déterministes.
 */
export function ChatsWidget() {
	const t = useTranslations('widgets.chats')
	faker.seed(42)
	const threads: ChatThread[] = Array.from({length: 4}).map(() => ({
		id: faker.string.uuid(),
		title: faker.lorem.words({min: 2, max: 4}),
		participants: faker.number.int({min: 2, max: 12}),
	}))
	return (
		<WidgetCard id='module-chats' title={t('title')}>
			<p className='mb-3 text-xs text-white/70'>
				{t('threads')}: {threads.length}
			</p>
			<ul role='list' className='space-y-3'>
				{threads.map(th => (
					<li key={th.id} role='listitem' className='rounded-md bg-white/5 p-4'>
						<p className='text-sm font-medium'>{th.title}</p>
						<p className='text-xs text-white/70'>{th.participants} {t('participants')}</p>
					</li>
				))}
			</ul>
		</WidgetCard>
	)
}
