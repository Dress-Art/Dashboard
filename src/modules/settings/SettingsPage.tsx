'use client'

import {useCallback, useState, type ChangeEvent} from 'react'
import {useTranslations} from 'next-intl'
import {SettingsWidget} from './SettingsWidget'
import {useDispatch, useSelector} from 'react-redux'
import {setThemeMode, toggleSidebar} from '@/store/store'
import type {RootState, ThemeMode} from '@/store/store'
// import {UserProfileSettings} from './components/user-profile-settings'
import {AdminSettings} from './components/admin-settings'

/**
 * SettingsPage
 * Page principale des paramètres avec navigation par onglets.
 * - i18n: titre via 'nav.settings', sous-titre via 'pages.settings.subtitle'
 * - A11y: section aria-label via 'pages.settings.regionLabel'; pattern WAI-ARIA Tabs
 */
export function SettingsPage () {
	const tNav = useTranslations('nav')
	const t = useTranslations('pages.settings')
	const tTabs = useTranslations('pages.settings.tabs')
	const tW = useTranslations('widgets.settings')
	const dispatch = useDispatch()
	const {themeMode, sidebarOpen} = useSelector((s: RootState) => s.ui)

	type TabKey = 'profile' | 'dashboard' | 'team' | 'system'
	const [tab, setTab] = useState<TabKey>('profile')

	const handleSelect = useCallback((key: TabKey) => () => setTab(key), [])
	const handleThemeChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			dispatch(setThemeMode(e.target.value as ThemeMode))
		},
		[dispatch],
	)
	const handleSidebarChange = useCallback(() => {
		dispatch(toggleSidebar())
	}, [dispatch])
	const tabBtnBase =
		'px-3 py-2 rounded-md text-sm transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30'
	const tabBtnActive = 'bg-white/10 text-white'
	const tabBtnInactive = 'text-white/80'

	return (
		<section aria-label={t('regionLabel')}>
			<header className='mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
				<div>
					<h1 id='settings-title' className='text-xl font-semibold'>
						{tNav('settings')}
					</h1>
					<p className='text-sm text-white/70 mt-1'>
						{t('subtitle')}
					</p>
				</div>
			</header>

			<nav
				role='tablist'
				aria-label={tTabs('ariaLabel')}
				className='mb-6 flex flex-wrap gap-2'
			>
				<button
					id='tab-profile'
					role='tab'
					aria-selected={tab === 'profile'}
					aria-controls='panel-profile'
					onClick={handleSelect('profile')}
					className={`${tabBtnBase} ${tab === 'profile' ? tabBtnActive : tabBtnInactive}`}
					data-testid='tab-profile'
				>
					{tTabs('profile')}
				</button>
				<button
					id='tab-dashboard'
					role='tab'
					aria-selected={tab === 'dashboard'}
					aria-controls='panel-dashboard'
					onClick={handleSelect('dashboard')}
					className={`${tabBtnBase} ${tab === 'dashboard' ? tabBtnActive : tabBtnInactive}`}
					data-testid='tab-dashboard'
				>
					{tTabs('dashboard')}
				</button>
				<button
					id='tab-team'
					role='tab'
					aria-selected={tab === 'team'}
					aria-controls='panel-team'
					onClick={handleSelect('team')}
					className={`${tabBtnBase} ${tab === 'team' ? tabBtnActive : tabBtnInactive}`}
					data-testid='tab-team'
				>
					{tTabs('team')}
				</button>
				<button
					id='tab-system'
					role='tab'
					aria-selected={tab === 'system'}
					aria-controls='panel-system'
					onClick={handleSelect('system')}
					className={`${tabBtnBase} ${tab === 'system' ? tabBtnActive : tabBtnInactive}`}
					data-testid='tab-system'
				>
					{tTabs('system')}
				</button>
			</nav>

			<div className='space-y-4'>
				<div
					id='panel-profile'
					role='tabpanel'
					aria-labelledby='tab-profile'
					hidden={tab !== 'profile'}
					className='rounded-lg border border-white/10 bg-white/5 p-4'
					data-testid='panel-profile'
				>
					{/* <UserProfileSettings /> */}
				</div>

				<div
					id='panel-dashboard'
					role='tabpanel'
					aria-labelledby='tab-dashboard'
					hidden={tab !== 'dashboard'}
					className='rounded-lg border border-white/10 bg-white/5 p-4'
					data-testid='panel-dashboard'
				>
					<SettingsWidget />
				</div>

				<div
					id='panel-team'
					role='tabpanel'
					aria-labelledby='tab-team'
					hidden={tab !== 'team'}
					className='rounded-lg border border-white/10 bg-white/5 p-4'
					data-testid='panel-team'
				>
					<AdminSettings />
				</div>

				<div
					id='panel-system'
					role='tabpanel'
					aria-labelledby='tab-system'
					hidden={tab !== 'system'}
					className='rounded-lg border border-white/10 bg-white/5 p-4'
					data-testid='panel-system'
				>
					<form className='space-y-6' aria-label={tTabs('system')}>
						<fieldset className='space-y-3'>
							<legend className='text-sm font-medium'>{tW('theme.title')}</legend>
							<div className='flex items-center gap-4'>
								<label className='flex items-center gap-2 text-sm' htmlFor='theme-mode-system'>
									<input
										id='theme-mode-system'
										name='theme-mode'
										type='radio'
										value='system'
										checked={themeMode === 'system'}
										onChange={handleThemeChange}
										aria-label={tW('theme.system')}
										data-testid='theme-radio-system'
									/>
									{tW('theme.system')}
								</label>
								<label className='flex items-center gap-2 text-sm' htmlFor='theme-mode-dark'>
									<input
										id='theme-mode-dark'
										name='theme-mode'
										type='radio'
										value='dark'
										checked={themeMode === 'dark'}
										onChange={handleThemeChange}
										aria-label={tW('theme.dark')}
										data-testid='theme-radio-dark'
									/>
									{tW('theme.dark')}
								</label>
								<label className='flex items-center gap-2 text-sm' htmlFor='theme-mode-light'>
									<input
										id='theme-mode-light'
										name='theme-mode'
										type='radio'
										value='light'
										checked={themeMode === 'light'}
										onChange={handleThemeChange}
										aria-label={tW('theme.light')}
										data-testid='theme-radio-light'
									/>
									{tW('theme.light')}
								</label>
							</div>
						</fieldset>

						<fieldset className='space-y-3'>
							<legend className='text-sm font-medium'>{tW('sidebar.title')}</legend>
							<label className='flex items-center gap-2 text-sm' htmlFor='sidebar-open'>
								<input
									id='sidebar-open'
									type='checkbox'
									checked={sidebarOpen}
									onChange={handleSidebarChange}
									aria-label={tW('sidebar.openLabel')}
									data-testid='sidebar-open'
								/>
								{tW('sidebar.openLabel')}
							</label>
						</fieldset>
					</form>
				</div>
			</div>
		</section>
	)
}

