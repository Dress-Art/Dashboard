import {configureStore, createSlice, type PayloadAction} from '@reduxjs/toolkit'
import type {DashboardKey} from '@/types/dashboard'

/**
 * uiSlice
 * Gère les préférences d'interface (ex: sidebar ouverte/fermée, thème,
 * visibilité des modules).
 */
export type ThemeMode = 'system' | 'light' | 'dark'

interface UiState {
    sidebarOpen: boolean
    themeMode: ThemeMode
    moduleVisibility: Record<DashboardKey, boolean>
}

const defaultModuleVisibility: Record<DashboardKey, boolean> = {
    analytics: true,
    users: true,
    notifications: true,
    emails: true,
    feedbacks: true,
    payments: true,
    calendar: true,
    subscriptions: true,
    chats: true,
    apis: true,
    monitoring: true,
    languages: true,
    settings: true,
    agents: false,
    delivery: false
}

const initialState: UiState = {
    sidebarOpen: true,
    // Par défaut sombre (cf. règle produit), tout en supportant le mode système
    themeMode: 'dark',
    moduleVisibility: defaultModuleVisibility,
}

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleSidebar(state) {
            state.sidebarOpen = !state.sidebarOpen
        },
        setThemeMode(state, action: PayloadAction<ThemeMode>) {
            state.themeMode = action.payload
        },
        setModuleVisibility(
            state,
            action: PayloadAction<{key: DashboardKey; visible: boolean}>,
        ) {
            const {key, visible} = action.payload
            state.moduleVisibility[key] = visible
        },
        setAllModulesVisibility(state, action: PayloadAction<boolean>) {
            const visible = action.payload
            ;(Object.keys(state.moduleVisibility) as DashboardKey[]).forEach(
                k => {
                    state.moduleVisibility[k] = visible
                },
            )
        },
        /**
         * hydrateUi
         * Permet d'hydrater l'état (ex: depuis localStorage côté client).
         */
        hydrateUi(state, action: PayloadAction<Partial<UiState>>) {
            const payload = action.payload
            if (payload.sidebarOpen !== undefined) {
                state.sidebarOpen = payload.sidebarOpen
            }
            if (payload.themeMode !== undefined) {
                state.themeMode = payload.themeMode
            }
            if (payload.moduleVisibility !== undefined) {
                state.moduleVisibility = {
                    ...state.moduleVisibility,
                    ...payload.moduleVisibility,
                }
            }
        },
    },
})

export const {
    toggleSidebar,
    setThemeMode,
    setModuleVisibility,
    setAllModulesVisibility,
    hydrateUi,
} = uiSlice.actions

export const store = configureStore({
	reducer: {
		ui: uiSlice.reducer,
	},
	devTools: process.env.NODE_ENV !== 'production',
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
