'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [info, setInfo] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!formData.email || !formData.password) {
            setError('Please fill in all fields')
            return
        }

        try {
            setLoading(true)
            setError(null)
            setInfo(null)

            // Tentative de connexion
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            })
            
            if (error) {
                // Gestion spécifique des erreurs
                if (error.message === 'Invalid login credentials') {
                    setError('Invalid email or password. Please check your credentials and try again.')
                } else if (error.message.includes('Email not confirmed')) {
                    setError('Please check your email and click the confirmation link before signing in.')
                } else {
                    setError(error.message)
                }
            } else if (data.user) {
                // Vérifier si l'utilisateur est confirmé
                if (!data.user.email_confirmed_at) {
                    setError('Please check your email and click the confirmation link before signing in.')
                    return
                }
                
                // Connexion réussie
                setInfo('Login successful! Redirecting...')
                setTimeout(() => {
                    router.push('/')
                }, 1000)
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.')
            console.error('Login error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleResendConfirmation = async () => {
        if (!formData.email) {
            setError('Please enter your email address first')
            return
        }

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: formData.email,
            })

            if (error) {
                setError(error.message)
            } else {
                setInfo('Confirmation email sent! Please check your inbox.')
            }
        } catch (err) {
            setError('Failed to resend confirmation email')
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Sign in to DashCraft
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Access your personalized dashboard
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Enter your email"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Enter your password"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm">{error}</p>
                                    {error.includes('confirmation') && (
                                        <button
                                            type="button"
                                            onClick={handleResendConfirmation}
                                            className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                                        >
                                            Resend confirmation email
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {info && (
                        <div className="bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm">{info}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <Link href="/signup" className="text-indigo-600 hover:text-indigo-500">
                            Create an account
                        </Link>
                        <button
                            type="button"
                            onClick={handleResendConfirmation}
                            className="text-indigo-600 hover:text-indigo-500 text-sm"
                        >
                            Resend confirmation
                        </button>
                    </div>
                </form>

                
            </div>
        </div>
    )
}