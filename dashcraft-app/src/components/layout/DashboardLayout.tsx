'use client'

import {type ReactNode} from 'react'
import {Sidebar} from '@/components/layout/Sidebar'
import {Topbar} from '@/components/layout/Topbar'
import {useSelector, useDispatch} from 'react-redux'
import type {RootState} from '@/store/store'
import {toggleSidebar} from '@/store/store'

/**
 * DashboardLayout
 * Layout principal avec Sidebar + Topbar + zone de contenu.
 */
export interface DashboardLayoutProps {
	children: ReactNode
}

export function DashboardLayout({children}: DashboardLayoutProps) {
	const dispatch = useDispatch()
	const isSidebarCollapsed = useSelector((s: RootState) => !s.ui.sidebarOpen)

	const handleToggleSidebar = () => {
		dispatch(toggleSidebar())
	}

	return (
		<div className="min-h-screen bg-white dark:bg-black">
			<Sidebar isCollapsed={isSidebarCollapsed} onToggle={handleToggleSidebar} />
			<div className={`transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
				<Topbar />
				<main className='p-6'>{children}</main>
			</div>
		</div>
	)
}
