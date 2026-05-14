'use client'

import {useEffect, useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {useAuthContext} from '@/contexts/AuthContext'
import {AuthLayout} from '@/components/layout/AuthLayout'
import {supabase} from '@/lib/supabase'
import {notify} from '@/lib/toast'

/**
 * Page d'arrivée du lien Supabase « reset password ».
 * Attend l'event `PASSWORD_RECOVERY` (Supabase échange le token automatiquement)
 * avant d'afficher le formulaire — pas de bypass possible sans token valide.
 */
export default function ResetPasswordPage() {
    const router = useRouter()
    const {updatePassword} = useAuthContext()

    const [ready, setReady] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Check for error in URL (otp_expired, invalid token, etc)
        const urlParams = new URLSearchParams(window.location.search)
        const errorDesc = urlParams.get('error_description')
        if (errorDesc) {
            setError(decodeURIComponent(errorDesc))
            return
        }

        // PKCE flow — échange le code query param pour une session
        const code = urlParams.get('code')
        if (code) {
            supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError, data }) => {
                if (exchangeError) {
                    setError(`Erreur lors de l'échange du code: ${exchangeError.message}`)
                } else if (data.session) {
                    setReady(true)
                }
            })
        }

        // Listen for auth state changes
        const {data} = supabase.auth.onAuthStateChange(event => {
            if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
                setReady(true)
            }
        })

        supabase.auth.getSession().then(({data: {session}}) => {
            if (session && typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
                setReady(true)
            }
        })

        return () => data.subscription.unsubscribe()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password.length < 8) {
            notify.error('Le mot de passe doit faire au moins 8 caractères')
            return
        }
        if (password !== confirm) {
            notify.error('Les mots de passe ne correspondent pas')
            return
        }
        try {
            setSubmitting(true)
            const result = (await updatePassword(password)) as {error?: {message: string}}
            if (result.error) {
                notify.error(result.error.message)
                return
            }
            notify.success('Mot de passe mis à jour')
            router.push('/')
        } catch (err) {
            notify.error(err)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <AuthLayout
            title="Nouveau mot de passe"
            subtitle="Choisissez un mot de passe d'au moins 8 caractères."
        >
            {error ? (
                <div className="space-y-4">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 p-4 rounded-xl text-sm">
                        <strong>Erreur:</strong> {error}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Le lien de réinitialisation est invalide ou a expiré. Demandez un nouveau lien.
                    </p>
                    <div className="flex gap-3">
                        <Link
                            href="/forgot-password"
                            className="flex-1 text-center py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 font-semibold transition-colors"
                        >
                            Demander un nouveau lien
                        </Link>
                        <Link
                            href="/login"
                            className="flex-1 text-center py-2.5 border border-gray-300 dark:border-gray-700 text-black dark:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 font-semibold transition-colors"
                        >
                            Connexion
                        </Link>
                    </div>
                </div>
            ) : !ready ? (
                <div className="space-y-4">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 p-4 rounded-xl text-sm">
                        En attente de la vérification du lien de réinitialisation. Si rien ne se passe, le lien est
                        peut-être expiré.
                    </div>
                    <Link
                        href="/forgot-password"
                        className="block w-full text-center py-2.5 border border-gray-300 dark:border-gray-700 text-black dark:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 font-semibold transition-colors"
                    >
                        Demander un nouveau lien
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-black dark:text-white mb-1.5">
                            Nouveau mot de passe
                        </label>
                        <input
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={8}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
                            placeholder="••••••••"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-black dark:text-white mb-1.5">Confirmer</label>
                        <input
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={8}
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors font-semibold"
                    >
                        {submitting ? 'Mise à jour...' : 'Mettre à jour'}
                    </button>
                </form>
            )}
        </AuthLayout>
    )
}
