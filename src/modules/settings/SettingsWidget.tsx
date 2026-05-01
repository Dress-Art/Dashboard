'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations} from 'next-intl'
import {useCallback, useMemo, type ChangeEvent} from 'react'
import {useDispatch, useSelector} from 'react-redux'
import config from '@/config/dashboard.json'
import type {DashboardConfig, DashboardKey} from '@/types/dashboard'
import {setAllModulesVisibility, setModuleVisibility} from '@/store/store'
import type {RootState} from '@/store/store'

/**
 * SettingsWidget
 * Contrôles de visibilité des modules du dashboard.
 * - Lit la liste des modules depuis `src/config/dashboard.json`
 * - Utilise Redux `ui.moduleVisibility` pour l'état
 * - Persistance assurée via `UiPersistenceGate` (localStorage)
 */
export function SettingsWidget() {
	const t = useTranslations('widgets.settings')
	const tNav = useTranslations('nav')
	const dispatch = useDispatch()
	const visibility = useSelector((s: RootState) => s.ui.moduleVisibility)
	const cfg = config as DashboardConfig

	const modules = useMemo(
		() =>
			cfg.modules
				.filter(m => m.visible)
				.sort((a, b) => a.order - b.order),
		[cfg.modules],
	)

	const handleSelectAll = useCallback(() => {
		dispatch(setAllModulesVisibility(true))
	}, [dispatch])

	const handleDeselectAll = useCallback(() => {
		dispatch(setAllModulesVisibility(false))
	}, [dispatch])

	const makeToggleHandler = useCallback(
		(key: DashboardKey) => (e: ChangeEvent<HTMLInputElement>) => {
			dispatch(setModuleVisibility({key, visible: e.target.checked}))
		},
		[dispatch],
	)

	return (
		<WidgetCard id='module-settings' title={t('title')}>
			<form aria-label={t('modules.visibilityLabel')} className='space-y-4'>
				<div className='flex items-center justify-between'>
					<h3 className='text-sm font-medium'>{t('modules.title')}</h3>
					<div className='flex items-center gap-2'>
						<button
							type='button'
							onClick={handleSelectAll}
							className='rounded-md px-3 py-1 text-xs hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500'
							aria-label={t('modules.selectAll')}
							data-testid='modules-select-all'
						>
							{t('modules.selectAll')}
						</button>
						<button
							type='button'
							onClick={handleDeselectAll}
							className='rounded-md px-3 py-1 text-xs hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500'
							aria-label={t('modules.deselectAll')}
							data-testid='modules-deselect-all'
						>
							{t('modules.deselectAll')}
						</button>
					</div>
				</div>

				<ul
					role='list'
					aria-label={t('modules.ariaLabel')}
					className='grid grid-cols-1 gap-3 sm:grid-cols-2'
				>
					{modules.map(m => (
						<li key={m.key} className='flex items-center gap-2 rounded-md border border-white/10 bg-white/5 p-3'>
							<input
								id={`module-${m.key}`}
								type='checkbox'
								className='h-4 w-4'
								checked={!!visibility[m.key]}
								onChange={makeToggleHandler(m.key)}
								aria-labelledby={`label-module-${m.key}`}
								data-testid={`module-toggle-${m.key}`}
							/>
							<label
								id={`label-module-${m.key}`}
								htmlFor={`module-${m.key}`}
								className='text-sm'
							>
								{tNav(m.key)}
							</label>
						</li>
					))}
				</ul>
			</form>
		</WidgetCard>
	)
}
