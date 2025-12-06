'use client'

import {useTranslations} from 'next-intl'
import {AnalyticsWidget} from './AnalyticsWidget'
import {SourcesBreakdownWidget} from './SourcesBreakdownWidget'
import {KpiWidget} from './KpiWidget'

/**
 * AnalyticsPage
 * Page d'analytique affichant les widgets de trafic et conversions.
 * - i18n: titres via 'nav.analytics' et 'pages.analytics.subtitle'
 * - A11y: section avec aria-label via 'pages.analytics.regionLabel'
 */
export function AnalyticsPage() {
	const tNav = useTranslations('nav')
	const t = useTranslations('pages.analytics')

	return (
		<section aria-label={t('regionLabel')}>
			<header className='mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
				<div>
					<h1 id='analytics-title' className='text-xl font-semibold'>
						{tNav('analytics')}
					</h1>
					<p className='text-sm text-white/70 mt-1'>
						{t('subtitle')}
					</p>
				</div>
			</header>

			<div className='grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch'>
				<div className='md:col-span-2'>
					<KpiWidget />
				</div>
				<div className='md:col-span-1 h-full'>
					<AnalyticsWidget />
				</div>
				<div className='md:col-span-1 h-full'>
					<SourcesBreakdownWidget />
				</div>
			</div>
		</section>
	)
}

