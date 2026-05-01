'use client'

import {useTranslations} from 'next-intl'
import {MonitoringWidget} from './MonitoringWidget'
import {InternalApisWidget} from './InternalApisWidget'

/**
 * MonitoringPage
 * Page de monitoring système affichant les widgets de métriques.
 * - i18n: titres via 'nav.monitoring' et 'pages.monitoring.subtitle'
 * - A11y: section avec aria-label via 'pages.monitoring.regionLabel'
 */
export function MonitoringPage() {
	const tNav = useTranslations('nav')
	const t = useTranslations('pages.monitoring')

	return (
		<section aria-label={t('regionLabel')}>
			<header className='mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
				<div>
					<h1 id='monitoring-title' className='text-xl font-semibold'>
						{tNav('monitoring')}
					</h1>
					<p className='text-sm text-white/70 mt-1'>
						{t('subtitle')}
					</p>
				</div>
			</header>

			<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
				<div className='md:col-span-2'>
					<MonitoringWidget />
				</div>
				<div className='md:col-span-2'>
					<InternalApisWidget />
				</div>
			</div>
		</section>
	)
}
