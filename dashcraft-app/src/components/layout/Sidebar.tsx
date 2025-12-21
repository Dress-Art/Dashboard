'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  HomeIcon,
  UsersIcon,
  UserGroupIcon,
  TruckIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname.startsWith(path) && path !== '/dashboard' ? true : pathname === path

  const menuItems = [
    {
      id: 'dashboard',
      title: 'Tableau de bord',
      icon: HomeIcon,
      path: '/dashboard',
      description: 'Vue d\'ensemble'
    },
    {
      id: 'users',
      title: 'Utilisateurs',
      icon: UsersIcon,
      path: '/modules/users',
      description: 'Gestion des utilisateurs'
    },
    {
      id: 'agents',
      title: 'Agents',
      icon: UserGroupIcon,
      path: '/modules/agents',
      description: 'Gestion des agents'
    },
    {
      id: 'delivery',
      title: 'Livraisons',
      icon: TruckIcon,
      path: '/modules/delivery',
      description: 'Gestion des livraisons'
    }
  ]

  return (
    <aside className={`bg-white dark:bg-black border-r border-gray-300 dark:border-gray-700 transition-all duration-300 flex flex-col h-screen fixed top-0 left-0 z-20 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-4 border-b border-gray-300 dark:border-gray-700 h-16 flex-shrink-0`}>
        {!isCollapsed && (
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            DashCraft
          </h1>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {isCollapsed ? (
            <ChevronDoubleRightIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDoubleLeftIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <div key={item.id} className="relative group">
            <Link
              href={item.path}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <item.icon className="w-6 h-6 flex-shrink-0" />
              
              {!isCollapsed && (
                <span className="ml-3 font-medium">{item.title}</span>
              )}
            </Link>
            {isCollapsed && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 text-sm font-medium text-white bg-gray-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                {item.title}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-300 dark:border-gray-700 mt-auto flex-shrink-0">
        <Link
          href="/settings"
          className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
            isActive('/settings')
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Cog6ToothIcon className="w-6 h-6 flex-shrink-0" />
          {!isCollapsed && <span className="ml-3 font-medium">Paramètres</span>}
        </Link>
        <button
          className="w-full flex items-center p-3 mt-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <ArrowRightOnRectangleIcon className="w-6 h-6 flex-shrink-0" />
          {!isCollapsed && <span className="ml-3 font-medium">Déconnexion</span>}
        </button>
      </div>
    </aside>
  )
}
// No new string, this will delete the matched text
