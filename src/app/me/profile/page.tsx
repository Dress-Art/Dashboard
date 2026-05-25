'use client'

import {useCallback, useEffect, useState} from 'react'
import {DashboardLayout} from '@/components/layout/DashboardLayout'
import {
    BuildingStorefrontIcon,
    CheckBadgeIcon,
    PhoneIcon,
    MapPinIcon,
    StarIcon,
    ShoppingBagIcon,
    ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline'
import {getMyProfileAction, upsertMyProfileAction, type ProfessionalProfile} from '@/app/actions/professional-profile'
import {notify} from '@/lib/toast'

function StatCard({icon: Icon, label, value}: {icon: typeof StarIcon; label: string; value: string | number}) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-neutral-950">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Icon className="w-4 h-4" />
                <p className="text-xs">{label}</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-black dark:text-white tabular-nums">{value}</p>
        </div>
    )
}

function FieldLabel({children}: {children: React.ReactNode}) {
    return (
        <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
            {children}
        </label>
    )
}

const inputClass =
    'w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-sm text-black dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10'

export default function MyProfilePage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [profile, setProfile] = useState<ProfessionalProfile | null>(null)
    const [specialtiesInput, setSpecialtiesInput] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await getMyProfileAction()
            if (!result.success) {
                setError(result.error)
                setProfile(result.profile)
            } else {
                setProfile(result.profile)
                setSpecialtiesInput((result.profile.specialties ?? []).join(', '))
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'erreur_inconnue')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    const update = <K extends keyof ProfessionalProfile>(key: K, value: ProfessionalProfile[K]) => {
        setProfile(prev => (prev ? {...prev, [key]: value} : prev))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profile) return

        const specialties = specialtiesInput
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)

        setSaving(true)
        try {
            const result = await upsertMyProfileAction({
                business_name: profile.business_name,
                bio: profile.bio,
                specialties,
                years_experience: profile.years_experience,
                base_rate: profile.base_rate,
                accepts_custom_orders: profile.accepts_custom_orders,
                delivery_time_days: profile.delivery_time_days,
                workshop_address: profile.workshop_address,
                workshop_city: profile.workshop_city,
                workshop_country: profile.workshop_country,
                phone_number: profile.phone_number,
                is_accepting_orders: profile.is_accepting_orders,
                max_orders_per_month: profile.max_orders_per_month,
            })
            if (!result.success) {
                notify.error(result.error ?? 'Erreur enregistrement')
                return
            }
            notify.success('Profil enregistré')
            await load()
        } catch (err) {
            notify.error(err)
        } finally {
            setSaving(false)
        }
    }

    if (loading || !profile) {
        return (
            <DashboardLayout>
                <div className="p-6 space-y-6">
                    <div className="h-8 w-48 rounded bg-gray-100 dark:bg-gray-900 animate-pulse" />
                    {[0, 1, 2].map(i => (
                        <div key={i} className="h-32 rounded-2xl bg-gray-100 dark:bg-gray-900 animate-pulse" />
                    ))}
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="p-6 bg-gray-50 dark:bg-black min-h-screen space-y-6">
                <header>
                    <h1 className="text-3xl font-bold text-black dark:text-white">Mon profil professionnel</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Vitrine de votre atelier visible côté marketplace.</p>
                </header>

                {error && error !== 'unauthorized' && (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-300">
                        Erreur : {error}
                    </div>
                )}

                {/* Stats en lecture seule (alimentées par la marketplace). */}
                <div className="grid gap-3 sm:grid-cols-3">
                    <StatCard icon={ShoppingBagIcon} label="Commandes totales" value={profile.total_orders} />
                    <StatCard icon={StarIcon} label="Note moyenne" value={profile.average_rating.toFixed(2)} />
                    <StatCard icon={ChatBubbleLeftEllipsisIcon} label="Avis reçus" value={profile.total_reviews} />
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Identité atelier */}
                    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-neutral-950 space-y-4">
                        <div className="flex items-center gap-2">
                            <BuildingStorefrontIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            <h2 className="text-lg font-semibold text-black dark:text-white">Identité de l&apos;atelier</h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <FieldLabel>Nom de l&apos;atelier</FieldLabel>
                                <input
                                    type="text"
                                    value={profile.business_name ?? ''}
                                    onChange={e => update('business_name', e.target.value || null)}
                                    placeholder="Ex. : Atelier Aïssatou"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <FieldLabel>Années d&apos;expérience</FieldLabel>
                                <input
                                    type="number"
                                    min={0}
                                    value={profile.years_experience ?? ''}
                                    onChange={e => update('years_experience', e.target.value ? Number(e.target.value) : null)}
                                    className={inputClass}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <FieldLabel>Bio / Présentation</FieldLabel>
                                <textarea
                                    value={profile.bio ?? ''}
                                    onChange={e => update('bio', e.target.value || null)}
                                    rows={3}
                                    placeholder="Parcours, style, signature…"
                                    className={`${inputClass} resize-y`}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <FieldLabel>Spécialités (séparées par virgules)</FieldLabel>
                                <input
                                    type="text"
                                    value={specialtiesInput}
                                    onChange={e => setSpecialtiesInput(e.target.value)}
                                    placeholder="Ex. : pagne wax, broderie, robes de mariée"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Atelier — adresse + contact */}
                    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-neutral-950 space-y-4">
                        <div className="flex items-center gap-2">
                            <MapPinIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            <h2 className="text-lg font-semibold text-black dark:text-white">Atelier &amp; contact</h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <FieldLabel>Adresse de l&apos;atelier</FieldLabel>
                                <input
                                    type="text"
                                    value={profile.workshop_address ?? ''}
                                    onChange={e => update('workshop_address', e.target.value || null)}
                                    placeholder="Ex. : Rue 217, Cadjèhoun"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <FieldLabel>Ville</FieldLabel>
                                <input
                                    type="text"
                                    value={profile.workshop_city ?? ''}
                                    onChange={e => update('workshop_city', e.target.value || null)}
                                    placeholder="Cotonou"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <FieldLabel>Pays</FieldLabel>
                                <input
                                    type="text"
                                    value={profile.workshop_country ?? ''}
                                    onChange={e => update('workshop_country', e.target.value || null)}
                                    placeholder="BJ"
                                    className={inputClass}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <FieldLabel>Téléphone WhatsApp</FieldLabel>
                                <div className="relative">
                                    <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="tel"
                                        value={profile.phone_number ?? ''}
                                        onChange={e => update('phone_number', e.target.value || null)}
                                        placeholder="+229 …"
                                        className={`${inputClass} pl-9`}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Capacité commerciale */}
                    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-neutral-950 space-y-4">
                        <div className="flex items-center gap-2">
                            <CheckBadgeIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            <h2 className="text-lg font-semibold text-black dark:text-white">Disponibilité &amp; tarifs</h2>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <FieldLabel>Tarif de base (FCFA)</FieldLabel>
                                <input
                                    type="number"
                                    min={0}
                                    step={500}
                                    value={profile.base_rate ?? ''}
                                    onChange={e => update('base_rate', e.target.value ? Number(e.target.value) : null)}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <FieldLabel>Délai de livraison (jours)</FieldLabel>
                                <input
                                    type="number"
                                    min={1}
                                    value={profile.delivery_time_days ?? ''}
                                    onChange={e => update('delivery_time_days', e.target.value ? Number(e.target.value) : null)}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <FieldLabel>Capacité mensuelle (commandes)</FieldLabel>
                                <input
                                    type="number"
                                    min={1}
                                    value={profile.max_orders_per_month ?? ''}
                                    onChange={e => update('max_orders_per_month', e.target.value ? Number(e.target.value) : null)}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-4 pt-2">
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={profile.is_accepting_orders}
                                    onChange={e => update('is_accepting_orders', e.target.checked)}
                                    className="rounded border-gray-300 dark:border-gray-700"
                                />
                                J&apos;accepte de nouvelles commandes
                            </label>
                            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={profile.accepts_custom_orders}
                                    onChange={e => update('accepts_custom_orders', e.target.checked)}
                                    className="rounded border-gray-300 dark:border-gray-700"
                                />
                                J&apos;accepte les commandes sur mesure
                            </label>
                        </div>
                    </section>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-black dark:bg-white px-6 py-2.5 text-sm font-medium text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                            {saving ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    )
}
