'use client'

import {useCallback, useMemo, useState, useTransition} from 'react'
import {useTranslations, useLocale} from 'next-intl'
import {useRouter} from 'next/navigation'
import {setLocaleAction} from '@/app/actions/set-locale'
import {getI18nConfig, getLocaleDisplayName, type LocaleCode} from '@/config/i18n'

/**
 * LanguageSwitcher
 * Sélecteur de langue accessible utilisant une server action (Option B).
 * - Met à jour le cookie NEXT_LOCALE côté serveur
 * - Rafraîchit la page pour recharger les messages
 */
export function LanguageSwitcher () {
	const t = useTranslations('widgets.languages.switch')
	const router = useRouter()
	const locale = useLocale()
	const [optimistic, setOptimistic] = useState<LocaleCode | null>(null)
	const [isPending, startTransition] = useTransition()
	const {available} = getI18nConfig()

	const options = useMemo(
		() => available.map(code => ({code, label: getLocaleDisplayName(code)})),
		[available],
	)

	const handleChange = useCallback(
		async (e: React.ChangeEvent<HTMLSelectElement>) => {
			const code = e.target.value as LocaleCode
			setOptimistic(code)
			const fd = new FormData()
			fd.set('locale', code)
			await setLocaleAction(fd)
			startTransition(() => {
				router.refresh()
			})
		},
		[router],
	)

	return (
		<div
			className='rounded-lg border border-white/10 bg-white/5 p-4'
			aria-busy={isPending}
		>
			<label htmlFor='language-select' className='mb-2 block text-sm'>
				{t('label')}
			</label>
			<div className='flex items-center gap-3'>
				<select
					id='language-select'
					name='locale'
					aria-label={t('label')}
					className='rounded-md bg-transparent px-3 py-2 text-sm outline-none ring-1 ring-white/10 hover:ring-white/20'
					onChange={handleChange}
					disabled={isPending}
					value={(optimistic ?? (locale as LocaleCode))}
				>
					{options.map(opt => (
						<option key={opt.code} value={opt.code} className='bg-[#0b0b0c]'>
							{opt.label}
						</option>
					))}
				</select>
				{isPending ? (
					<span className='text-xs text-white/60'>…</span>
				) : null}
			</div>
			<p role='status' aria-live='polite' className='sr-only'>
				{optimistic ? t('changedTo', {name: getLocaleDisplayName(optimistic)}) : ''}
			</p>
		</div>
	)
}
