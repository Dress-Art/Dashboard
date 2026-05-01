'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations} from 'next-intl'
import {faker} from '@faker-js/faker'

interface EmailStat {
	key: 'sent' | 'opened' | 'clicked'
	value: number
}

/**
 * EmailsWidget
 * Statistiques emails (envoyés, ouverts, cliqués) mockées avec faker.
 * Données déterministes via faker.seed(42).
 */
export function EmailsWidget() {
	const t = useTranslations('widgets.emails')
	faker.seed(42)
	const stats: EmailStat[] = [
		{key: 'sent', value: faker.number.int({min: 1000, max: 5000})},
		{key: 'opened', value: faker.number.int({min: 500, max: 4000})},
		{key: 'clicked', value: faker.number.int({min: 100, max: 1500})},
	]
	return (
		<WidgetCard id='module-emails' title={t('title')}>
			<ul role='list' className='grid grid-cols-3 gap-4'>
				{stats.map(s => (
					<li key={s.key} role='listitem' className='rounded-md bg-white/5 p-4'>
						<p className='text-xs text-white/70'>{t(s.key)}</p>
						<p className='text-lg font-semibold'>{s.value}</p>
					</li>
				))}
			</ul>
		</WidgetCard>
	)
}
