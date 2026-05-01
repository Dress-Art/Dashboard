'use client'

import {useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {useAuthContext} from '@/contexts/AuthContext'
import {AuthLayout} from '@/components/layout/AuthLayout'
import {notify} from '@/lib/toast'
import {toE164} from '@/lib/utils'

type Tab = 'email' | 'phone'

export default function LoginPage() {
    const router = useRouter()
    const {signIn, requestPhoneOtp, verifyPhoneOtp} = useAuthContext()

    const [tab, setTab] = useState<Tab>('email')
    const [loading, setLoading] = useState(false)

    const [emailForm, setEmailForm] = useState({email: '', password: ''})

    const [phoneStep, setPhoneStep] = useState<'request' | 'verify'>('request')
    const [phoneInput, setPhoneInput] = useState('')
    const [phoneE164, setPhoneE164] = useState('')
    const [otpCode, setOtpCode] = useState('')

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!emailForm.email || !emailForm.password) {
            notify.error('Email et mot de passe requis')
            return
        }
        try {
            setLoading(true)
            const result = (await signIn(emailForm.email, emailForm.password)) as {
                error?: {message: string}
            }
            if (result.error) {
                if (result.error.message === 'Invalid login credentials') {
                    notify.error('Email ou mot de passe incorrect')
                } else if (result.error.message.includes('Email not confirmed')) {
                    notify.error('Vérifiez votre email pour confirmer votre compte')
                } else {
                    notify.error(result.error.message)
                }
                return
            }
            notify.success('Connexion réussie')
            router.push('/')
        } catch (err) {
            notify.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handlePhoneRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        const e164 = toE164(phoneInput)
        if (!e164 || e164.length < 10) {
            notify.error('Numéro de téléphone invalide')
            return
        }
        try {
            setLoading(true)
            const result = (await requestPhoneOtp(e164)) as {error?: {message: string}}
            if (result.error) {
                notify.error(result.error.message)
                return
            }
            setPhoneE164(e164)
            setPhoneStep('verify')
            notify.success('Code envoyé', `SMS envoyé au ${e164}`)
        } catch (err) {
            notify.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleOtpVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        if (otpCode.length < 4) {
            notify.error('Code à 6 chiffres requis')
            return
        }
        try {
            setLoading(true)
            const result = (await verifyPhoneOtp(phoneE164, otpCode.trim())) as {error?: {message: string}}
            if (result.error) {
                notify.error(result.error.message)
                return
            }
            notify.success('Connexion réussie')
            router.push('/')
        } catch (err) {
            notify.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout
            title="Connexion"
            subtitle="Espace réservé aux professionnels DressArt"
            footer={
                <>
                    Pas encore de compte ?{' '}
                    <Link href="/signup" className="font-medium text-black dark:text-white hover:underline">
                        Créer un compte
                    </Link>
                </>
            }
        >
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6" data-testid="login-tabs">
                <button
                    onClick={() => setTab('email')}
                    data-testid="tab-email"
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                        tab === 'email'
                            ? 'text-black dark:text-white border-b-2 border-black dark:border-white'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    Email
                </button>
                <button
                    onClick={() => {
                        setTab('phone')
                        setPhoneStep('request')
                        setOtpCode('')
                    }}
                    data-testid="tab-phone"
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                        tab === 'phone'
                            ? 'text-black dark:text-white border-b-2 border-black dark:border-white'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    Téléphone
                </button>
            </div>

            {tab === 'email' && (
                <form onSubmit={handleEmailSubmit} className="space-y-4" data-testid="email-form">
                    <Field label="Email">
                        <input
                            type="email"
                            autoComplete="email"
                            required
                            value={emailForm.email}
                            onChange={e => setEmailForm({...emailForm, email: e.target.value})}
                            className={inputCls}
                            placeholder="vous@dressart.com"
                            data-testid="email-input"
                        />
                    </Field>
                    <Field
                        label="Mot de passe"
                        right={
                            <Link
                                href="/forgot-password"
                                data-testid="forgot-password-link"
                                className="text-xs text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                            >
                                Oublié ?
                            </Link>
                        }
                    >
                        <input
                            type="password"
                            autoComplete="current-password"
                            required
                            value={emailForm.password}
                            onChange={e => setEmailForm({...emailForm, password: e.target.value})}
                            className={inputCls}
                            placeholder="••••••••"
                            data-testid="password-input"
                        />
                    </Field>
                    <PrimaryButton loading={loading} label="Se connecter" loadingLabel="Connexion..." testid="email-submit" />
                </form>
            )}

            {tab === 'phone' && phoneStep === 'request' && (
                <form onSubmit={handlePhoneRequest} className="space-y-4">
                    <Field
                        label="Téléphone"
                        hint="Format local Bénin accepté (ex: 61198941). Code envoyé par SMS."
                    >
                        <input
                            type="tel"
                            autoComplete="tel"
                            required
                            value={phoneInput}
                            onChange={e => setPhoneInput(e.target.value)}
                            className={inputCls}
                            placeholder="+229 61 19 89 41"
                        />
                    </Field>
                    <PrimaryButton loading={loading} label="Recevoir le code" loadingLabel="Envoi..." />
                </form>
            )}

            {tab === 'phone' && phoneStep === 'verify' && (
                <form onSubmit={handleOtpVerify} className="space-y-4">
                    <Field
                        label="Code reçu par SMS"
                        hint={
                            <>
                                Envoyé au <span className="font-medium">{phoneE164}</span>
                            </>
                        }
                    >
                        <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            required
                            maxLength={6}
                            value={otpCode}
                            onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-black dark:text-white placeholder-gray-400 text-center text-2xl tabular-nums tracking-widest focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
                            placeholder="000000"
                        />
                    </Field>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setPhoneStep('request')
                                setOtpCode('')
                            }}
                            className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-black dark:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 font-medium transition-colors"
                        >
                            Changer de numéro
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors font-semibold"
                        >
                            {loading ? 'Vérification...' : 'Vérifier'}
                        </button>
                    </div>
                </form>
            )}
        </AuthLayout>
    )
}

// =============================================================================
// Sous-composants partagés (auth UI tokens)
// =============================================================================

const inputCls =
    'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10'

interface FieldProps {
    label: string
    hint?: React.ReactNode
    right?: React.ReactNode
    children: React.ReactNode
}

function Field({label, hint, right, children}: FieldProps) {
    return (
        <div>
            <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-black dark:text-white">{label}</label>
                {right}
            </div>
            {children}
            {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{hint}</p>}
        </div>
    )
}

interface PrimaryButtonProps {
    loading: boolean
    label: string
    loadingLabel: string
    testid?: string
}

function PrimaryButton({loading, label, loadingLabel, testid}: PrimaryButtonProps) {
    return (
        <button
            type="submit"
            disabled={loading}
            data-testid={testid}
            className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors font-semibold"
        >
            {loading ? loadingLabel : label}
        </button>
    )
}
