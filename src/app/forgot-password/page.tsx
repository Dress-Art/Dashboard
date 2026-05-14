'use client'

import {useState} from 'react'
import Link from 'next/link'
import {useAuthContext} from '@/contexts/AuthContext'
import {AuthLayout} from '@/components/layout/AuthLayout'
import {notify} from '@/lib/toast'

export default function ForgotPasswordPage() {
    const {resetPassword} = useAuthContext()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim()) {
            notify.error('Email requis')
            return
        }
        try {
            setLoading(true)
            const result = (await resetPassword(email.trim())) as {error?: {message: string}}
            if (result.error && !/user|not found|invalid/i.test(result.error.message)) {
                notify.error(result.error.message)
                return
            }
            setSent(true)
            notify.success('Email envoyé', 'Vérifiez votre boîte de réception')
        } catch (err) {
            notify.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout
            title="Mot de passe oublié"
            subtitle={
                sent
                    ? 'Lien de réinitialisation envoyé.'
                    : 'Entrez votre email, nous vous enverrons un lien de réinitialisation.'
            }
            footer={
                <Link href="/login" className="font-medium text-black dark:text-white hover:underline">
                    Retour à la connexion
                </Link>
            }
        >
            {sent ? (
                <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-200 p-4 rounded-xl text-sm">
                        Si un compte existe pour <strong>{email}</strong>, vous allez recevoir un email avec un
                        lien de réinitialisation. Pensez à vérifier vos spams.
                    </div>
                    <Link
                        href="/login"
                        className="block w-full text-center py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 font-semibold transition-colors"
                    >
                        Retour à la connexion
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-black dark:text-white mb-1.5">Email</label>
                        <input
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
                            placeholder="vous@dressart.com"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors font-semibold"
                    >
                        {loading ? 'Envoi...' : 'Envoyer le lien'}
                    </button>
                </form>
            )}
        </AuthLayout>
    )
}
