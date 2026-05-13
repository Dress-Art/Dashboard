'use client'

import {useEffect, useMemo, useState} from 'react'
import {listDeliveries, buildTrackingUrl, type DeliveryRow} from '@/lib/deliveries-api'
import {updateDeliveryStatusAction} from '@/app/actions/deliveries'
import {supabase} from '@/lib/supabase'
import {notify} from '@/lib/toast'
import {DeliveryStatus, DELIVERY_STATUS_LABELS_FR} from '@/types/delivery.types'
import {CheckIcon, TruckIcon, CameraIcon, ArrowPathIcon} from '@heroicons/react/24/outline'

interface MeDeliveriesPageProps {
    driverId: string
}

function statusNext(status: DeliveryStatus): DeliveryStatus | null {
    if (status === 'assigned') return 'picked_up'
    if (status === 'picked_up') return 'in_transit'
    if (status === 'in_transit') return 'delivered'
    return null
}

export function MeDeliveriesPage({driverId}: MeDeliveriesPageProps) {
    const [deliveries, setDeliveries] = useState<DeliveryRow[]>([])
    const [loading, setLoading] = useState(true)
    const [busyId, setBusyId] = useState<string | null>(null)
    const [signedByName, setSignedByName] = useState<Record<string, string>>({})
    const [proofUrl, setProofUrl] = useState<Record<string, string>>({})
    const [proofFile, setProofFile] = useState<Record<string, File | null>>({})

    const load = async () => {
        setLoading(true)
        try {
            const result = await listDeliveries({driverId, limit: 200})
            setDeliveries(result.deliveries)
        } catch (error) {
            notify.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void load()
    }, [driverId])

    const counts = useMemo(() => ({
        assigned: deliveries.filter(d => d.status === 'assigned').length,
        picked_up: deliveries.filter(d => d.status === 'picked_up').length,
        in_transit: deliveries.filter(d => d.status === 'in_transit').length,
        delivered: deliveries.filter(d => d.status === 'delivered').length,
    }), [deliveries])

    const advance = async (delivery: DeliveryRow) => {
        const next = statusNext(delivery.status)
        if (!next) return

        setBusyId(delivery.id)
        try {
            let finalProofUrl = proofUrl[delivery.id] || undefined
            const file = proofFile[delivery.id]
            if (file) {
                const path = `${delivery.id}/${Date.now()}-${file.name}`
                const {error: uploadError} = await supabase.storage
                    .from('delivery-proofs')
                    .upload(path, file, {upsert: true})
                if (uploadError) {
                    notify.error(uploadError)
                    return
                }

                const {data: signed, error: signedError} = await supabase.storage
                    .from('delivery-proofs')
                    .createSignedUrl(path, 60 * 60 * 24 * 7)
                if (signedError || !signed?.signedUrl) {
                    notify.error(signedError ?? 'Impossible de signer la preuve')
                    return
                }

                finalProofUrl = signed.signedUrl
            }

            const result = await updateDeliveryStatusAction({
                deliveryId: delivery.id,
                status: next,
                proofUrl: finalProofUrl,
                signedByName: signedByName[delivery.id] || undefined,
            })
            if (!result.success) {
                notify.error(result.error ?? 'Erreur action livraison')
                return
            }
            notify.success('Livraison mise à jour', DELIVERY_STATUS_LABELS_FR[next])
            await load()
        } catch (error) {
            notify.error(error)
        } finally {
            setBusyId(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold text-black dark:text-white">Mes livraisons</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Vue simple pour les livreurs, sans surcharge.</p>
                </div>
                <button
                    onClick={() => void load()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-black dark:text-white"
                >
                    <ArrowPathIcon className="w-4 h-4" />
                    Rafraîchir
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    ['assigned', 'Assignées'],
                    ['picked_up', 'Récupérées'],
                    ['in_transit', 'En transit'],
                    ['delivered', 'Livrées'],
                ].map(([key, label]) => (
                    <div key={key} className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
                        <p className="text-2xl font-bold text-black dark:text-white">{counts[key as keyof typeof counts]}</p>
                    </div>
                ))}
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="rounded-xl border border-gray-300 dark:border-gray-700 p-6 text-gray-500">Chargement…</div>
                ) : deliveries.length === 0 ? (
                    <div className="rounded-xl border border-gray-300 dark:border-gray-700 p-6 text-gray-500">
                        Aucune livraison assignée.
                    </div>
                ) : (
                    deliveries.map(delivery => {
                        const next = statusNext(delivery.status)
                        const canAdvance = Boolean(next)
                        return (
                            <div key={delivery.id} className="rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black p-5 space-y-4">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div>
                                        <p className="text-sm text-gray-500">Commande</p>
                                        <h2 className="text-xl font-semibold text-black dark:text-white">#{delivery.order_id.slice(0, 8).toUpperCase()}</h2>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{delivery.customer_name}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{delivery.customer_address}</p>
                                    </div>
                                    <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                        {DELIVERY_STATUS_LABELS_FR[delivery.status]}
                                    </span>
                                </div>

                                <div className="grid gap-3 md:grid-cols-3">
                                    <label className="block">
                                        <span className="text-sm font-medium text-black dark:text-white">Nom du réceptionnaire</span>
                                        <input
                                            value={signedByName[delivery.id] ?? ''}
                                            onChange={e => setSignedByName(prev => ({...prev, [delivery.id]: e.target.value}))}
                                            placeholder="Ex. : Marie Aho"
                                            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                                        />
                                    </label>
                                    <label className="block md:col-span-2">
                                        <span className="text-sm font-medium text-black dark:text-white">Preuve de livraison</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => setProofFile(prev => ({...prev, [delivery.id]: e.target.files?.[0] ?? null}))}
                                            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                                        />
                                        <input
                                            value={proofUrl[delivery.id] ?? ''}
                                            onChange={e => setProofUrl(prev => ({...prev, [delivery.id]: e.target.value}))}
                                            placeholder="Optionnel : URL de preuve déjà hébergée"
                                            className="mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                                        />
                                    </label>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {delivery.tracking_token && (
                                        <a
                                            href={buildTrackingUrl(delivery.tracking_token)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-black dark:text-white"
                                        >
                                            <TruckIcon className="w-4 h-4" />
                                            Tracking client
                                        </a>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => void advance(delivery)}
                                        disabled={!canAdvance || busyId === delivery.id}
                                        className="inline-flex items-center gap-2 rounded-lg bg-black dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-black disabled:opacity-50"
                                    >
                                        <CheckIcon className="w-4 h-4" />
                                        {busyId === delivery.id ? 'Mise à jour…' : next === 'picked_up' ? 'Marquer récupérée' : next === 'in_transit' ? 'Marquer en transit' : 'Marquer livrée'}
                                    </button>
                                    {delivery.proof_url && (
                                        <a
                                            href={delivery.proof_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-black dark:text-white"
                                        >
                                            <CameraIcon className="w-4 h-4" />
                                            Voir la preuve
                                        </a>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
