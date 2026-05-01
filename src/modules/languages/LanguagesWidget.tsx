'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations, useLocale} from 'next-intl'
import {getI18nConfig, type LocaleCode, getLocaleDisplayName} from '@/config/i18n'

/**
 * LanguagesWidget
 * Affiche la langue courante et la liste des langues disponibles.
 */
export function LanguagesWidget() {
	const t = useTranslations('widgets.languages')
	const locale = useLocale()
	const {available} = getI18nConfig()
	return (
		<WidgetCard id='module-languages' title={t('title')}>
			<p className='mb-3 text-xs text-white/70'>
				{t('current')}: {getLocaleDisplayName(locale as LocaleCode)}
			</p>
			<div>
				<p className='text-xs text-white/70 mb-2'>{t('available')}</p>
				<ul role='list' className='flex gap-2'>
					{available.map(code => (
						<li
							key={code}
							role='listitem'
							aria-current={code === locale ? 'true' : 'false'}
							className='rounded-md bg-white/5 px-2 py-1'
							title={code}
						>
							{getLocaleDisplayName(code)}
						</li>
					))}
				</ul>
			</div>
		</WidgetCard>
	)
}
