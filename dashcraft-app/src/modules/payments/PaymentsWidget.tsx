'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations} from 'next-intl'
import {faker} from '@faker-js/faker'

/**
 * PaymentsWidget
 * Vue synthétique des paiements: revenus et nombre de factures.
 * Données déterministes via faker.seed(42).
 */
export function PaymentsWidget() {
	const t = useTranslations('widgets.payments')
	faker.seed(42)
	const revenue = faker.number.int({min: 10_000, max: 200_000})
	const invoices = faker.number.int({min: 10, max: 200})
	return (
		<WidgetCard id='module-payments' title={t('title')}>
			<div className='grid grid-cols-2 gap-4'>
				<div className='rounded-md bg-white/5 p-4'>
					<p className='text-xs text-white/70'>{t('revenue')}</p>
					<p className='text-lg font-semibold'>{revenue}</p>
				</div>
				<div className='rounded-md bg-white/5 p-4'>
					<p className='text-xs text-white/70'>{t('invoices')}</p>
					<p className='text-lg font-semibold'>{invoices}</p>
				</div>
			</div>
		</WidgetCard>
	)
}
