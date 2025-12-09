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
	const sidebarOpen = useSelector((s: RootState) => s.ui.sidebarOpen)

	const handleToggleSidebar = () => {
		dispatch(toggleSidebar())
	}

	return (
		<div
			className={`min-h-screen grid grid-rows-[auto_1fr] ${
				sidebarOpen ? 'md:grid-cols-[16rem_1fr]' : 'md:grid-cols-1'
			}`}
		>
			<div className='md:col-span-2'>
				<Topbar />
			</div>
			<aside
				className={sidebarOpen ? 'hidden md:block' : 'hidden'}
				data-testid='sidebar-container'
				aria-hidden={!sidebarOpen}
			>
				<Sidebar isCollapsed={!sidebarOpen} onToggle={handleToggleSidebar} />
			</aside>
			<main className='p-4'>{children}</main>
		</div>
	)
}
