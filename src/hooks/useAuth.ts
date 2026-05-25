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

    /**
     * Lance le flow OAuth Google. Le redirect Supabase envoie vers
     * `${SITE_URL}/auth/callback?next=/` qui fait l'exchange PKCE côté serveur
     * (cookie HttpOnly invisible côté client) puis renvoie sur la home.
     */
    const signInWithGoogle = async () => {
        const siteUrl =
            process.env.NEXT_PUBLIC_SITE_URL ||
            (typeof window !== 'undefined' ? window.location.origin : '')
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${siteUrl}/auth/callback?next=/`,
            },
        })
        return { data, error }
    }

    /**
     * Envoie un email de réinitialisation de mot de passe avec un lien
     * pointant vers `${NEXT_PUBLIC_SITE_URL}/reset-password`.
     */
    const resetPassword = async (email: string) => {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')
        // L'email Supabase pointe vers /auth/callback (server route) qui fait
        // l'exchange PKCE puis redirige vers /reset-password. Sans ce détour,
        // le code_verifier (cookie HttpOnly) ne serait pas lisible côté client.
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
        })
        return { data, error }
    }

    /**
     * Met à jour le mot de passe de l'utilisateur courant. À appeler depuis
     * la page /reset-password après que Supabase a échangé le token de l'URL.
     */
    const updatePassword = async (newPassword: string) => {
        const { data, error } = await supabase.auth.updateUser({ password: newPassword })
        return { data, error }
    }

    /**
     * Demande un OTP par SMS pour le numéro indiqué (E.164 attendu).
     * Le hook SMS Supabase déclenche l'envoi via MsgFlash.
     */
    const requestPhoneOtp = async (phoneE164: string) => {
        const { data, error } = await supabase.auth.signInWithOtp({
            phone: phoneE164,
        })
        return { data, error }
    }

    /**
     * Vérifie le code OTP reçu par SMS. Démarre la session côté client si OK.
     */
    const verifyPhoneOtp = async (phoneE164: string, token: string) => {
        const { data, error } = await supabase.auth.verifyOtp({
            phone: phoneE164,
            token,
            type: 'sms',
        })
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
        signInWithGoogle,
        resetPassword,
        updatePassword,
        requestPhoneOtp,
        verifyPhoneOtp,
    }
}