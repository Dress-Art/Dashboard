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
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname.startsWith(path) && path !== '/dashboard' ? true : pathname === path

  // 🎯 NAVIGATION SIMPLIFIÉE - Clic direct vers les pages principales
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
    <div className={`bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      
      {/* Header avec toggle */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            DashCraft
          </h1>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d={isCollapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7M19 19l-7-7 7-7"} />
          </svg>
        </button>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <div key={item.id} className="relative group">
            <Link
              href={item.path}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-l-4 border-indigo-500'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              
              {!isCollapsed && (
                <div className="ml-3">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {item.description}
                  </div>
                </div>
              )}
            </Link>

            {/* Tooltip en mode collapsed */}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                <div className="font-medium">{item.title}</div>
                <div className="text-xs opacity-75">{item.description}</div>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer avec paramètres et déconnexion */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-2">
        
        {/* Paramètres */}
        <div className="relative group">
          <Link
            href="/settings"
            className={`flex items-center p-3 rounded-lg transition-colors ${
              pathname === '/settings'
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Cog6ToothIcon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3">Paramètres</span>}
          </Link>
          
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Paramètres
            </div>
          )}
        </div>

        {/* Déconnexion */}
        <div className="relative group">
          <button
            className="w-full flex items-center p-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            onClick={() => {
              // Logique de déconnexion
              console.log('Déconnexion')
            }}
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3">Se déconnecter</span>}
          </button>
          
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-red-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              Se déconnecter
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

