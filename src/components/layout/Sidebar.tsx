'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {useSelector} from 'react-redux'
import {useTranslations} from 'next-intl'
import {useAuthContext} from '@/contexts/AuthContext'
import {Icon} from '@/lib/icons'
import dashboardConfig from '@/config/dashboard.json'
import type {DashboardConfig, DashboardModule, DashboardKey} from '@/types/dashboard'
import type {RootState} from '@/store/store'
import type {Role} from '@/lib/roles'
import {
    ArrowRightOnRectangleIcon,
    ChevronDoubleLeftIcon,
    ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline'

interface SidebarProps {
    isCollapsed: boolean
    onToggle: () => void
}

const cfg = dashboardConfig as DashboardConfig

function pathFor(key: DashboardKey): string {
    return `/modules/${key}`
}

/**
 * Override de label par rôle : un couturier ne se rend pas sur "Couturier",
 * il gère ses clients/modèles/mesures — d'où le libellé "Mes clients".
 * Retourne null si le libellé i18n par défaut suffit.
 */
function navLabelForRole(key: DashboardKey, role: Role | null): string | null {
    if (role === 'couturier' && key === 'couturier') return 'Mes clients'
    return null
}

export function Sidebar({isCollapsed, onToggle}: SidebarProps) {
    const pathname = usePathname()
    const {signOut, role} = useAuthContext()
    const t = useTranslations('nav')
    const moduleVisibility = useSelector((s: RootState) => s.ui.moduleVisibility)

    const isActive = (path: string) =>
        path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`)

    const allowedByRole = (m: DashboardModule): boolean => {
        if (!m.roles || m.roles.length === 0) return true
        if (!role) return false
        return m.roles.includes(role as Role)
    }

    const navModules: DashboardModule[] = (cfg.modules ?? [])
        .filter(m => m.key !== 'settings')
        .filter(m => moduleVisibility[m.key as DashboardKey])
        .filter(allowedByRole)
        .sort((a, b) => a.order - b.order)

    const settingsModule = cfg.modules?.find(m => m.key === 'settings')
    const settingsAllowed = settingsModule ? allowedByRole(settingsModule) : false

    return (
        <aside
            className={`bg-white dark:bg-black border-r border-gray-300 dark:border-gray-700 transition-all duration-300 flex flex-col h-screen fixed top-0 left-0 z-20 ${
                isCollapsed ? 'w-20' : 'w-64'
            }`}
        >
            <div
                className={`flex items-center ${
                    isCollapsed ? 'justify-center' : 'justify-between'
                } p-4 border-b border-gray-300 dark:border-gray-700 h-16 flex-shrink-0`}
            >
                {!isCollapsed && (
                    <h1 className='text-xl font-bold text-gray-900 dark:text-white'>DressArt</h1>
                )}
                <button
                    onClick={onToggle}
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className='p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
                >
                    {isCollapsed ? (
                        <ChevronDoubleRightIcon className='w-5 h-5 text-gray-500 dark:text-gray-400' />
                    ) : (
                        <ChevronDoubleLeftIcon className='w-5 h-5 text-gray-500 dark:text-gray-400' />
                    )}
                </button>
            </div>

            <nav className='flex-1 p-4 space-y-1 overflow-y-auto'>
                <SidebarLink
                    href='/'
                    iconName='home'
                    label={t('dashboard')}
                    active={isActive('/')}
                    collapsed={isCollapsed}
                />
                {navModules.map(m => {
                    const override = navLabelForRole(m.key as DashboardKey, (role as Role | null) ?? null)
                    return (
                        <SidebarLink
                            key={m.key}
                            href={pathFor(m.key as DashboardKey)}
                            iconName={m.icon}
                            label={override ?? t(m.key as DashboardKey)}
                            active={isActive(pathFor(m.key as DashboardKey))}
                            collapsed={isCollapsed}
                        />
                    )
                })}
            </nav>

            <div className='p-4 border-t border-gray-300 dark:border-gray-700 mt-auto flex-shrink-0 space-y-1'>
                {settingsModule && moduleVisibility.settings && settingsAllowed && (
                    <SidebarLink
                        href={pathFor('settings')}
                        iconName={settingsModule.icon}
                        label={t('settings')}
                        active={isActive(pathFor('settings'))}
                        collapsed={isCollapsed}
                    />
                )}
                <button
                    onClick={() => signOut()}
                    aria-label={t('logout')}
                    className='w-full flex items-center p-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                >
                    <ArrowRightOnRectangleIcon className='w-6 h-6 flex-shrink-0' />
                    {!isCollapsed && <span className='ml-3 font-medium'>{t('logout')}</span>}
                </button>
            </div>
        </aside>
    )
}

interface SidebarLinkProps {
    href: string
    iconName: DashboardModule['icon'] | 'home'
    label: string
    active: boolean
    collapsed: boolean
}

function SidebarLink({href, iconName, label, active, collapsed}: SidebarLinkProps) {
    return (
        <div className='relative group'>
            <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                    active
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
                <Icon name={iconName} className='w-6 h-6 flex-shrink-0' />
                {!collapsed && <span className='ml-3 font-medium'>{label}</span>}
            </Link>
            {collapsed && (
                <div className='absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 text-sm font-medium text-white bg-gray-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-30'>
                    {label}
                </div>
            )}
        </div>
    )
}
