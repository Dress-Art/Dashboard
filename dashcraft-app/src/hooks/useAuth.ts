'use client'

import { useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
    user: User | null
    session: Session | null
    loading: boolean
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        session: null,
        loading: true,
    })

    useEffect(() => {
        // Récupérer la session courante
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setState({
                user: session?.user ?? null,
                session,
                loading: false,
            })
        }

        getSession()

        // Écouter les changements d'auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                console.log('Auth state changed:', event, session?.user?.email)
                setState({
                    user: session?.user ?? null,
                    session,
                    loading: false,
                })
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    // Actions auth
    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        return { data, error }
    }

    const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata,
            },
        })
        return { data, error }
    }

    const signOut = async () => {
        const { error } = await supabase.auth.signOut()
        return { error }
    }

    const resetPassword = async (email: string) => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email)
        return { data, error }
    }

    return {
        user: state.user,
        session: state.session,
        loading: state.loading,
        isAuthenticated: !!state.user,
        signIn,
        signUp,
        signOut,
        resetPassword,
    }
}