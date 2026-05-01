'use client'

import {useTranslations} from 'next-intl'
import {LanguagesWidget} from './LanguagesWidget'
import {LanguageSwitcher} from './LanguageSwitcher'

/**
 * LanguagesPage
 * Page de gestion des langues.
 * - i18n: titre via 'nav.languages', sous-titre via 'pages.languages.subtitle'
 * - A11y: section avec aria-label via 'pages.languages.regionLabel'
 */
export function LanguagesPage () {
	const tNav = useTranslations('nav')
	const t = useTranslations('pages.languages')

	return (
		<section aria-label={t('regionLabel')}>
			<header className='mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
				<div>
					<h1 id='languages-title' className='text-xl font-semibold'>
						{tNav('languages')}
					</h1>
					<p className='text-sm text-white/70 mt-1'>
						{t('subtitle')}
					</p>
				</div>
			</header>

			<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
				<div className='md:col-span-1'>
					<LanguagesWidget />
				</div>
				<div className='md:col-span-1'>
					<LanguageSwitcher />
				</div>
			</div>
		</section>
	)
}
