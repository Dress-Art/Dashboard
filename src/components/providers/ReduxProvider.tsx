'use client'

import {Provider, useDispatch, useSelector} from 'react-redux'
import {type ReactNode, useEffect, useState} from 'react'
import {store, hydrateUi} from '@/store/store'
import type {RootState} from '@/store/store'

/**
 * ReduxProvider
 * Fournit le store Redux à l'application.
 */
export interface ReduxProviderProps {
	children: ReactNode
}

/**
 * UiPersistenceGate
 * - Hydrate l'état UI depuis localStorage au montage
 * - Persiste les changements d'UI (thème, visibilité modules)
 */
function UiPersistenceGate({children}: {children: ReactNode}) {
	const dispatch = useDispatch()
	const ui = useSelector((s: RootState) => s.ui)
    const [hydrationDone, setHydrationDone] = useState(false)

	// Hydratation initiale
	useEffect(() => {
		try {
			const raw = localStorage.getItem('dashcraft:ui')
			if (raw) {
				const parsed = JSON.parse(raw)
				dispatch(hydrateUi(parsed))
			}
		} catch (err) {
			void err
			// ignore parsing errors
		} finally {
			setHydrationDone(true)
		}
	}, [dispatch])

	// Persistance à chaque changement
	useEffect(() => {
		if (!hydrationDone) return
		try {
			const payload = {
				sidebarOpen: ui.sidebarOpen,
				themeMode: ui.themeMode,
				moduleVisibility: ui.moduleVisibility,
			}
			localStorage.setItem('dashcraft:ui', JSON.stringify(payload))
		} catch (err) {
			void err
			// ignore quota errors
		}
	}, [hydrationDone, ui.sidebarOpen, ui.themeMode, ui.moduleVisibility])

	return <>{children}</>
}

export function ReduxProvider({children}: ReduxProviderProps) {
    return (
        <Provider store={store}>
            <UiPersistenceGate>{children}</UiPersistenceGate>
        </Provider>
    )
}
