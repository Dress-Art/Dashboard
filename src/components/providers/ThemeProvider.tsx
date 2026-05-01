'use client'

import {useEffect} from 'react'
import {useSelector} from 'react-redux'
import {type RootState} from '@/store/store'

/**
 * ThemeProvider
 * Fournit le thème (dark par défaut)
 * et applique la classe "dark" sur <html>.
 */
export interface ThemeProviderProps {
    children: React.ReactNode
}

/**
 * SyncThemeWithStore
 * Se place sous NextThemesProvider et synchronise le thème courant
 * avec la valeur Redux `ui.themeMode` ('light' | 'dark').
 */
export function SyncThemeWithStore() {
    const mode = useSelector((s: RootState) => s.ui.themeMode)

    useEffect(() => {
        console.log('SyncThemeWithStore effect triggered, mode:', mode)
        const root = document.documentElement
        
        // Appliquer/retirer la classe dark
        if (mode === 'dark') {
            root.classList.add('dark')
            localStorage.setItem('theme', 'dark')
            console.log('Applied dark theme')
        } else {
            root.classList.remove('dark')
            localStorage.setItem('theme', 'light')
            console.log('Applied light theme')
        }
        
        // Force Tailwind to recalculate by triggering a style recalculation
        // This ensures dark: variants are properly applied
        const event = new Event('theme-change')
        window.dispatchEvent(event)
        
        // Force repaint
        void root.offsetHeight
        
    }, [mode])

    return null
}

// This is the script that will be injected into the <head> of the document.
// It runs before any React rendering, preventing the flash of incorrect theme.
const blockingThemeScript = `
(function() {
  try {
    const theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
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
