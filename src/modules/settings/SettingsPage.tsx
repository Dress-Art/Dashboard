'use client'

import {useCallback, useState, type ChangeEvent} from 'react'
import {useTranslations} from 'next-intl'
import {SettingsWidget} from './SettingsWidget'
import {useDispatch, useSelector} from 'react-redux'
import {setThemeMode, toggleSidebar} from '@/store/store'
import type {RootState, ThemeMode} from '@/store/store'
import {AdminSettings} from './components/admin-settings'
import {useAuthContext} from '@/contexts/AuthContext'

/**
 * SettingsPage — paramètres dashboard.
 *
 * Onglets :
 *   - dashboard : visibilité des modules dans la sidebar
 *   - team      : gestion d'équipe (composant AdminSettings existant)
 *   - system    : thème + comportement de la sidebar
 *
 * L'onglet "profile" historique a été retiré : son contenu n'avait jamais
 * été implémenté (import UserProfileSettings commenté, fichier inexistant).
 * Le profil utilisateur connecté est plutôt édité depuis le module
 * Utilisateurs côté admin, et la page /me/profile côté pro (à venir).
 */
export function SettingsPage() {
    const tNav = useTranslations('nav')
    const t = useTranslations('pages.settings')
    const tTabs = useTranslations('pages.settings.tabs')
    const tW = useTranslations('widgets.settings')
    const dispatch = useDispatch()
    const {role} = useAuthContext()
    const {themeMode, sidebarOpen} = useSelector((s: RootState) => s.ui)
    const isAdmin = role === 'admin'

    type TabKey = 'dashboard' | 'team' | 'system'
    const [tab, setTab] = useState<TabKey>('dashboard')

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
        'px-4 py-2 rounded-full text-sm font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10'
    const tabBtnActive = 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
    const tabBtnInactive = 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-900 dark:hover:border-gray-200'

    const panelClass = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-neutral-950'

    return (
        <section aria-label={t('regionLabel')} className="p-6 bg-gray-50 dark:bg-black min-h-screen space-y-6">
            <header>
                <h1 id="settings-title" className="text-3xl font-bold text-black dark:text-white">
                    {tNav('settings')}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
            </header>

            <nav role="tablist" aria-label={tTabs('ariaLabel')} className="flex flex-wrap gap-2">
                <button
                    id="tab-dashboard"
                    role="tab"
                    aria-selected={tab === 'dashboard'}
                    aria-controls="panel-dashboard"
                    onClick={handleSelect('dashboard')}
                    className={`${tabBtnBase} ${tab === 'dashboard' ? tabBtnActive : tabBtnInactive}`}
                    data-testid="tab-dashboard"
                >
                    {tTabs('dashboard')}
                </button>
                {isAdmin && (
                    <button
                        id="tab-team"
                        role="tab"
                        aria-selected={tab === 'team'}
                        aria-controls="panel-team"
                        onClick={handleSelect('team')}
                        className={`${tabBtnBase} ${tab === 'team' ? tabBtnActive : tabBtnInactive}`}
                        data-testid="tab-team"
                    >
                        {tTabs('team')}
                    </button>
                )}
                <button
                    id="tab-system"
                    role="tab"
                    aria-selected={tab === 'system'}
                    aria-controls="panel-system"
                    onClick={handleSelect('system')}
                    className={`${tabBtnBase} ${tab === 'system' ? tabBtnActive : tabBtnInactive}`}
                    data-testid="tab-system"
                >
                    {tTabs('system')}
                </button>
            </nav>

            <div className="space-y-4">
                <div
                    id="panel-dashboard"
                    role="tabpanel"
                    aria-labelledby="tab-dashboard"
                    hidden={tab !== 'dashboard'}
                    className={panelClass}
                    data-testid="panel-dashboard"
                >
                    <SettingsWidget />
                </div>

                {isAdmin && (
                    <div
                        id="panel-team"
                        role="tabpanel"
                        aria-labelledby="tab-team"
                        hidden={tab !== 'team'}
                        className={panelClass}
                        data-testid="panel-team"
                    >
                        <AdminSettings />
                    </div>
                )}

                <div
                    id="panel-system"
                    role="tabpanel"
                    aria-labelledby="tab-system"
                    hidden={tab !== 'system'}
                    className={panelClass}
                    data-testid="panel-system"
                >
                    <form className="space-y-6" aria-label={tTabs('system')}>
                        <fieldset className="space-y-3">
                            <legend className="text-sm font-semibold text-black dark:text-white">{tW('theme.title')}</legend>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 dark:text-gray-300">
                                {(['system', 'dark', 'light'] as ThemeMode[]).map(mode => (
                                    <label key={mode} className="inline-flex items-center gap-2 cursor-pointer" htmlFor={`theme-mode-${mode}`}>
                                        <input
                                            id={`theme-mode-${mode}`}
                                            name="theme-mode"
                                            type="radio"
                                            value={mode}
                                            checked={themeMode === mode}
                                            onChange={handleThemeChange}
                                            aria-label={tW(`theme.${mode}`)}
                                            data-testid={`theme-radio-${mode}`}
                                        />
                                        {tW(`theme.${mode}`)}
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        <fieldset className="space-y-3">
                            <legend className="text-sm font-semibold text-black dark:text-white">{tW('sidebar.title')}</legend>
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer" htmlFor="sidebar-open">
                                <input
                                    id="sidebar-open"
                                    type="checkbox"
                                    checked={sidebarOpen}
                                    onChange={handleSidebarChange}
                                    aria-label={tW('sidebar.openLabel')}
                                    data-testid="sidebar-open"
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
