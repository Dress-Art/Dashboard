'use client'

import {useEffect} from 'react'
import {useSelector} from 'react-redux'
import {type RootState} from '@/store/store'

/**
 * ThemeProvider
 * Fournit le thème (dark par défaut) via next-themes
 * et applique la classe "dark" sur <html>.
 */
export interface ThemeProviderProps {
    children: React.ReactNode
}

/**
 * SyncThemeWithStore
 * Se place sous NextThemesProvider et synchronise le thème courant
 * avec la valeur Redux `ui.themeMode` ('system' | 'light' | 'dark').
 */
function SyncThemeWithStore() {
    const mode = useSelector((s: RootState) => s.ui.themeMode)

    useEffect(() => {
        const root = document.documentElement
        if (mode === 'dark') {
            root.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        } else {
            root.classList.remove('dark')
            localStorage.setItem('theme', 'light')
        }
    }, [mode])

    return null
}

// This is the script that will be injected into the <head> of the document.
// It runs before any React rendering, preventing the flash of incorrect theme.
const blockingThemeScript = `
(function() {
  try {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      // Default to light theme if no setting is found
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    // If localStorage is not available, default to light theme
    console.error('Could not set initial theme from localStorage', e);
  }
})();
`

export function ThemeProvider({children}: ThemeProviderProps) {
    return (
        <>
            <script dangerouslySetInnerHTML={{__html: blockingThemeScript}} />
            <SyncThemeWithStore />
            {children}
        </>
    )
}
