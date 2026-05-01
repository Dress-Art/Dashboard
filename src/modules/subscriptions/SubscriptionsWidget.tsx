'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations} from 'next-intl'
import {faker} from '@faker-js/faker'

/**
 * SubscriptionsWidget
 * Compteur d'abonnements actifs et annulés (mock déterministe).
 */
export function SubscriptionsWidget() {
	const t = useTranslations('widgets.subscriptions')
	faker.seed(42)
	const active = faker.number.int({min: 100, max: 500})
	const canceled = faker.number.int({min: 5, max: 100})
	return (
		<WidgetCard id='module-subscriptions' title={t('title')}>
			<div className='grid grid-cols-2 gap-4'>
				<div className='rounded-md bg-white/5 p-4'>
					<p className='text-xs text-white/70'>{t('active')}</p>
					<p className='text-lg font-semibold'>{active}</p>
				</div>
				<div className='rounded-md bg-white/5 p-4'>
					<p className='text-xs text-white/70'>{t('canceled')}</p>
					<p className='text-lg font-semibold'>{canceled}</p>
				</div>
			</div>
		</WidgetCard>
	)
}
