'use client'

import {useEffect, useState} from 'react'
import {ArrowPathIcon, MapPinIcon, TruckIcon, ShieldCheckIcon} from '@heroicons/react/24/outline'
import {notify} from '@/lib/toast'
import type {TassiMarketplace, TassiPickupPoint, TassiCarrier} from '@/types/tassi.types'

interface TassiMeBundle {
    marketplace: TassiMarketplace | null
    pickup_points: TassiPickupPoint[]
    carriers: TassiCarrier[]
    errors: Array<{section: string; message: string; status?: number}>
}

const KYC_BADGE: Record<string, string> = {
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export function TassiConfigPage() {
    const [data, setData] = useState<TassiMeBundle | null>(null)
    const [loading, setLoading] = useState(true)

    const load = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/tassi/me', {cache: 'no-store'})
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                notify.error(`Tassi /me — ${res.status}: ${body.error ?? 'erreur inconnue'}`)
                setData(null)
                return
            }
            const json = (await res.json()) as TassiMeBundle
            setData(json)
            if (json.errors.length > 0) {
                notify.info(
                    `${json.errors.length} section(s) en erreur`,
                    json.errors.map(e => `${e.section}: ${e.message}`).join(' / '),
                )
            }
        } catch (err) {
            notify.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-black dark:text-white">Tassi · Configuration</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Identité marketplace, points de retrait, transporteurs disponibles côté Tassi.
                    </p>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="px-4 py-2 text-black dark:text-white bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 transition-colors font-medium flex items-center gap-2"
                >
                    <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Rafraîchir
                </button>
            </div>

            {/* Identité marketplace */}
            <Section title="Marketplace" icon={<ShieldCheckIcon className="w-5 h-5" />}>
                {!data?.marketplace ? (
                    <Empty hint={loading ? 'Chargement…' : 'Marketplace introuvable. Vérifie TASSI_API_KEY côté serveur.'} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <Field label="Nom" value={data.marketplace.name} mono={false} />
                        <Field label="ID Tassi" value={`#${data.marketplace.id}`} />
                        <Field label="Email" value={data.marketplace.email} />
                        <Field
                            label="KYC"
                            value={
                                <span
                                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                        KYC_BADGE[data.marketplace.kyc_status] ?? 'bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    {data.marketplace.kyc_status}
                                </span>
                            }
                        />
                        <Field label="Subscription" value={data.marketplace.has_subscription ? 'active' : 'inactive'} />
                        <Field
                            label="Compteurs"
                            value={`${data.marketplace.customers_count} clients · ${data.marketplace.packages_count} colis`}
                        />
                        <Field label="Ville" value={data.marketplace.city ?? '—'} />
                        <Field
                            label="Créée le"
                            value={new Date(data.marketplace.created_at).toLocaleDateString('fr-FR')}
                        />
                        <Field
                            label="Mode API"
                            value={
                                process.env.NEXT_PUBLIC_TASSI_ENV === 'live' ? (
                                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                        LIVE
                                    </span>
                                ) : (
                                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                        SANDBOX
                                    </span>
                                )
                            }
                        />
                    </div>
                )}
            </Section>

            {/* Pickup points */}
            <Section title="Points de retrait" icon={<MapPinIcon className="w-5 h-5" />}>
                {!data?.pickup_points || data.pickup_points.length === 0 ? (
                    <Empty hint={loading ? 'Chargement…' : 'Aucun point de retrait. Configure-les dans le dashboard Tassi.'} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase">
                                <tr>
                                    <th className="text-left py-2 px-3">ID</th>
                                    <th className="text-left py-2 px-3">Nom</th>
                                    <th className="text-left py-2 px-3">Adresse</th>
                                    <th className="text-left py-2 px-3">Ville</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {data.pickup_points.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                                        <td className="py-2 px-3 font-mono text-xs text-gray-500">#{p.id}</td>
                                        <td className="py-2 px-3 font-medium text-black dark:text-white">{p.name}</td>
                                        <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{p.address}</td>
                                        <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{p.city}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Section>

            {/* Carriers */}
            <Section title="Transporteurs" icon={<TruckIcon className="w-5 h-5" />}>
                {!data?.carriers || data.carriers.length === 0 ? (
                    <Empty hint={loading ? 'Chargement…' : 'Aucun transporteur disponible.'} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {data.carriers.map(c => (
                            <div
                                key={c.id}
                                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4"
                            >
                                <div className="flex items-center gap-2 font-semibold text-black dark:text-white">
                                    {c.name}
                                    <span className="text-xs font-mono text-gray-500">#{c.id}</span>
                                </div>
                                {c.description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.description}</p>
                                )}
                                {(c.contact_phone || c.contact_email) && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-0.5">
                                        {c.contact_phone && <div>📞 {c.contact_phone}</div>}
                                        {c.contact_email && <div>✉️ {c.contact_email}</div>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            {/* Erreurs partielles */}
            {data && data.errors.length > 0 && (
                <Section title="Erreurs Tassi" icon={<span className="text-red-500">!</span>}>
                    <ul className="space-y-2 text-sm">
                        {data.errors.map((e, i) => (
                            <li
                                key={i}
                                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-lg p-3"
                            >
                                <strong className="capitalize">{e.section}</strong> — {e.message}
                                {e.status ? ` (HTTP ${e.status})` : ''}
                            </li>
                        ))}
                    </ul>
                </Section>
            )}
        </div>
    )
}

// =============================================================================
// Sub-components
// =============================================================================

interface SectionProps {
    title: string
    icon?: React.ReactNode
    children: React.ReactNode
}

function Section({title, icon, children}: SectionProps) {
    return (
        <section className="bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-black dark:text-white mb-4">
                {icon}
                {title}
            </h2>
            {children}
        </section>
    )
}

interface FieldProps {
    label: string
    value: React.ReactNode
    mono?: boolean
}

function Field({label, value, mono}: FieldProps) {
    return (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div
                className={`text-sm text-black dark:text-white ${mono ? 'font-mono' : 'font-medium'} break-words`}
            >
                {value}
            </div>
        </div>
    )
}

function Empty({hint}: {hint: string}) {
    return (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400 italic">{hint}</div>
    )
}
