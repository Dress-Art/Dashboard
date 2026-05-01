'use client'

import {useTranslations} from 'next-intl'
import {CalendarWidget} from './CalendarWidget'

/**
 * CalendarPage
 * Page Calendrier affichant le widget d'événements.
 * - i18n: titres via 'nav.calendar' et 'pages.calendar.subtitle'
 * - A11y: structure sémantique et aria-label (region unique via pages.calendar.regionLabel)
 */
export function CalendarPage() {
	const tNav = useTranslations('nav')
	const t = useTranslations('pages.calendar')

	return (
		<section aria-label={t('regionLabel')}>
			<header className='mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
				<div>
					<h1 id='calendar-title' className='text-xl font-semibold'>
						{tNav('calendar')}
					</h1>
					<p className='text-sm text-white/70 mt-1'>
						{t('subtitle')}
					</p>
				</div>
			</header>

			<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
				<CalendarWidget />
			</div>
		</section>
	)
}
