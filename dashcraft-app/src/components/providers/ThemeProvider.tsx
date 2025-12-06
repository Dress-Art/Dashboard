'use client'

import {ThemeProvider as NextThemesProvider, useTheme} from 'next-themes'
import {type ReactNode, useEffect} from 'react'
import {useSelector} from 'react-redux'
import type {RootState} from '@/store/store'

/**
 * ThemeProvider
 * Fournit le thème (dark par défaut) via next-themes
 * et applique la classe "dark" sur <html>.
 */
export interface ThemeProviderProps {
    children: ReactNode
}

/**
 * SyncThemeWithStore
 * Se place sous NextThemesProvider et synchronise le thème courant
 * avec la valeur Redux `ui.themeMode` ('system' | 'light' | 'dark').
 */
function SyncThemeWithStore() {
    const mode = useSelector((s: RootState) => s.ui.themeMode)
    const {setTheme} = useTheme()

    useEffect(() => {
        if (!mode) return
        setTheme(mode)
    }, [mode, setTheme])

    return null
}

export function ThemeProvider({children}: ThemeProviderProps) {
    return (
        <NextThemesProvider
            attribute='class'
            defaultTheme='dark'
            enableSystem
        >
            <SyncThemeWithStore />
            {children}
        </NextThemesProvider>
    )
}
