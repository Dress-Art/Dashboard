'use client'

import {useCallback, useTransition, useEffect} from 'react'
import {useLocale, useTranslations} from 'next-intl'
import {useRouter} from 'next/navigation'
import {useDispatch, useSelector} from 'react-redux'
import {useAuthContext} from '@/contexts/AuthContext'
import {setLocaleAction} from '@/app/actions/set-locale'
import {getLocaleDisplayName, type LocaleCode} from '@/config/i18n'
import {Icon} from '@/lib/icons'
import {setThemeMode, type ThemeMode} from '@/store/store'
import type {RootState} from '@/store/store'

/**
 * Topbar
 * Barre supérieure avec recherche, sélecteur de langue et toggle de thème.
 */
export function Topbar() {
    const t = useTranslations('app')
    const locale = useLocale()
    const router = useRouter()
    const dispatch = useDispatch()
    const mode = useSelector((s: RootState) => s.ui.themeMode)
    const [isPending, startTransition] = useTransition()
    
    // 🔐 AJOUTER: Récupérer l'état d'authentification
    const { user, signOut } = useAuthContext()

    // ✅ Appliquer le thème visuellement
    useEffect(() => {
        const applyTheme = () => {
            const root = document.documentElement
            
            if (mode === 'dark') {
                root.classList.add('dark')
                localStorage.setItem('theme', 'dark')
            } else if (mode === 'light') {
                root.classList.remove('dark')
                localStorage.setItem('theme', 'light')
            } else if (mode === 'system') {
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                if (systemPrefersDark) {
                    root.classList.add('dark')
                } else {
                    root.classList.remove('dark')
                }
                localStorage.setItem('theme', 'system')
            }
        }

        applyTheme()

        if (mode === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            const handleSystemChange = (e: MediaQueryListEvent) => {
                if (e.matches) {
                    document.documentElement.classList.add('dark')
                } else {
                    document.documentElement.classList.remove('dark')
                }
            }
            
            mediaQuery.addEventListener('change', handleSystemChange)
            return () => mediaQuery.removeEventListener('change', handleSystemChange)
        }
    }, [mode])

    function handleToggleTheme() {
        const order: ThemeMode[] = ['system', 'dark', 'light']
        const idx = order.indexOf(mode)
        const next = order[(idx + 1) % order.length]
        dispatch(setThemeMode(next))
    }

    // 🔐 AJOUTER: Fonction de déconnexion
    const handleSignOut = async () => {
        try {
            await signOut()
            router.push('/login')
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error)
        }
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

    // ✅ AJOUTER: Indicateur visuel du mode actuel
    const getThemeIcon = () => {
        switch (mode) {
            case 'dark': return '🌙'
            case 'light': return '☀️'
            case 'system': return '💻'
            default: return '⚙️'
        }
    }

    // 🔐 AJOUTER: Nom d'utilisateur pour affichage
    const getUserDisplayName = () => {
        if (user?.user_metadata?.name) {
            return user.user_metadata.name
        }
        if (user?.email) {
            return user.email.split('@')[0]
        }
        return 'Utilisateur'
    }

    const getUserInitials = () => {
        const name = getUserDisplayName()
        return name.split(' ').map((part: string) => part[0]).join('').substring(0, 2).toUpperCase()
    }

    return (
        <header
            className='sticky top-0 z-10 border-b border-white/10 dark:border-gray-700 bg-white/5 dark:bg-gray-800/90 backdrop-blur p-4 transition-colors duration-200'
            aria-label='Topbar'
        >
            <div className='flex items-center gap-3'>
                <form className='flex-1 max-w-md'>
                    <label htmlFor='search' className='sr-only'>
                        {t('searchPlaceholder')}
                    </label>
                    <input
                        id='search'
                        type='search'
                        placeholder={t('searchPlaceholder')}
                        className='w-full rounded-md bg-white/5 dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 outline-none ring-1 ring-inset ring-white/10 dark:ring-gray-600 focus:ring-2 focus:ring-blue-500 transition-colors duration-200'
                    />
                </form>
                
                <div className='flex items-center gap-2'>
                    {/* Bouton Theme */}
                    <button
                        onClick={handleToggleTheme}
                        className='rounded-md px-3 py-2 text-sm hover:bg-white/5 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 flex items-center gap-2'
                        aria-label={`${t('themeToggle')} - Mode actuel: ${mode}`}
                        title={`Mode: ${mode} - Cliquer pour changer`}
                    >
                        <Icon name='settings' className='h-5 w-5 text-gray-600 dark:text-gray-300' />
                        <span className="text-sm">{getThemeIcon()}</span>
                    </button>
                    
                    {/* Langues */}
                    <nav aria-label={t('language')} className='flex items-center gap-1' aria-busy={isPending}>
                        <button
                            onClick={handleClickFr}
                            className='rounded-md px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-white/5 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200'
                            aria-pressed={locale === 'fr'}
                        >
                            {getLocaleDisplayName('fr')}
                        </button>
                        <button
                            onClick={handleClickEn}
                            className='rounded-md px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-white/5 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200'
                            aria-pressed={locale === 'en'}
                        >
                            {getLocaleDisplayName('en')}
                        </button>
                    </nav>

                    {/* 🔐 AJOUTER: Menu Utilisateur */}
                    <div className="relative group">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/5 dark:hover:bg-gray-700 transition-colors duration-200">
                            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                {getUserInitials()}
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:block">
                                {getUserDisplayName()}
                            </span>
                        </div>
                        
                        {/* Menu déroulant utilisateur */}
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                            <div className="p-2">
                                <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                    {user?.email}
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors duration-200 mt-1"
                                >
                                    Se déconnecter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}
