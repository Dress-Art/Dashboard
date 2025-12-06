'use client'

import { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { store } from '@/store/store'
import { AuthProvider } from '@/contexts/AuthContext'

interface AppProvidersProps {
    children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
    return (
        <Provider store={store}>
            <AuthProvider>
                {children}
            </AuthProvider>
        </Provider>
    )
}
