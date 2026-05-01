'use client'

import {type ReactNode, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {Sidebar} from '@/components/layout/Sidebar'
import {Topbar} from '@/components/layout/Topbar'
import {useSelector, useDispatch} from 'react-redux'
import type {RootState} from '@/store/store'
import {toggleSidebar} from '@/store/store'
import {useAuthContext} from '@/contexts/AuthContext'
import {isProfessionalRole} from '@/lib/roles'

/**
 * DashboardLayout
 * Layout principal du dashboard. Combine 3 responsabilités :
 *   1. Gate auth → redirige vers /login si pas connecté
 *   2. Gate professionnel → redirige vers /not-authorized si rôle non pro
 *   3. Rendu sidebar + topbar + zone contenu
 */
export interface DashboardLayoutProps {
	children: ReactNode
}

export function DashboardLayout({children}: DashboardLayoutProps) {
	const router = useRouter()
	const {user, role, loading} = useAuthContext()
	const dispatch = useDispatch()
	const isSidebarCollapsed = useSelector((s: RootState) => !s.ui.sidebarOpen)

	useEffect(() => {
		if (loading) return
		if (!user) {
			router.push('/login')
			return
		}
		if (!isProfessionalRole(role)) {
			router.push('/not-authorized')
		}
	}, [user, role, loading, router])

	const handleToggleSidebar = () => {
		dispatch(toggleSidebar())
	}

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
			</div>
		)
	}

	if (!user || !isProfessionalRole(role)) {
		// Redirection en cours
		return null
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
