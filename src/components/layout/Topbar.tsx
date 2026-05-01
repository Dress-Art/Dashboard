'use client'

import { useCallback, useTransition } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { useAuthContext } from '@/contexts/AuthContext'
import { setLocaleAction } from '@/app/actions/set-locale'
import { type LocaleCode } from '@/config/i18n'
import { setThemeMode } from '@/store/store'
import type { RootState } from '@/store/store'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

/**
 * Topbar
 * Barre supérieure avec recherche, sélecteur de langue et toggle de thème.
 */
export function Topbar() {
	const locale = useLocale()
	const router = useRouter()
	const dispatch = useDispatch()
	const mode = useSelector((s: RootState) => s.ui.themeMode)
	const [isPending, startTransition] = useTransition()
	const { user } = useAuthContext()

	function handleToggleTheme() {
		dispatch(setThemeMode(mode === 'dark' ? 'light' : 'dark'))
	}

	const handleSetLocale = useCallback(
		(loc: LocaleCode) => {
			startTransition(async () => {
				const fd = new FormData()
				fd.set('locale', loc)
				await setLocaleAction(fd)
				router.refresh()
			})
		},
		[router],
	)

	const handleClickFr = useCallback(() => handleSetLocale('fr'), [handleSetLocale])
	const handleClickEn = useCallback(() => handleSetLocale('en'), [handleSetLocale])

	return (
		<header className="bg-white dark:bg-black border-b border-gray-300 dark:border-gray-700 h-16 flex items-center justify-between px-4">
			<div className="flex items-center">
				{/* Espace réservé pour le bouton de menu sur mobile si nécessaire */}
			</div>

			<div className="flex items-center space-x-4">
				<button
					onClick={handleToggleTheme}
					className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
					style={{ color: 'var(--text-icon)' }}
				>
					{mode === 'dark' ? (
						<SunIcon className="w-6 h-6" />
					) : (
						<MoonIcon className="w-6 h-6" />
					)}
				</button>

				<div className="flex items-center space-x-2 border-l border-gray-300 dark:border-gray-700 pl-4">
					<button
						onClick={handleClickFr}
						disabled={isPending || locale === 'fr'}
						className={`px-3 py-1 text-sm rounded-md transition-colors ${
							locale === 'fr' 
								? 'bg-black dark:bg-white text-white dark:text-black font-semibold' 
								: 'text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900'
						}`}
					>
						FR
					</button>
					<button
						onClick={handleClickEn}
						disabled={isPending || locale === 'en'}
						className={`px-3 py-1 text-sm rounded-md transition-colors ${
							locale === 'en' 
								? 'bg-black dark:bg-white text-white dark:text-black font-semibold' 
								: 'text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900'
						}`}
					>
						EN
					</button>
				</div>

				{user && (
					<div className="flex items-center space-x-3">
						<div className="w-8 h-8 rounded-full bg-black dark:bg-white flex items-center justify-center font-bold text-white dark:text-black">
							{user.email?.[0].toUpperCase()}
						</div>
						<span className="text-sm font-medium text-black dark:text-white">
							{user.email}
						</span>
					</div>
				)}
			</div>
		</header>
	)
}
