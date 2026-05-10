'use client'

import {useState} from 'react'
import {useRouter} from 'next/navigation'
import {PaperAirplaneIcon, ExclamationTriangleIcon} from '@heroicons/react/24/outline'
import {notify} from '@/lib/toast'

/**
 * Bouton « Lancer la livraison » — spec §6.7.
 *
 * UN seul bouton + UN champ optionnel "Note pour le transporteur" (max 500).
 * Tous les autres champs (origin/destination/dimensions/mode) sont assemblés
 * côté serveur depuis les données déjà en base.
 *
 * Désactivé tant que :
 *   - confection pas marquée terminée
 *   - shipment Tassi déjà existant pour cette commande
 *   - champs profil couturier ou client manquants (liste passée par missingFields)
 */

interface LaunchDeliveryButtonProps {
    orderId: string
    confectionCompleted: boolean
    shipmentAlreadyExists: boolean
    /** Liste des chemins de champs manquants (ex: 'couturier.shop_name'). */
    missingFields?: string[]
    /** Callback après succès, ex: refetch parent. Optionnel — sinon `router.refresh()`. */
    onSuccess?: () => void
}

const ERROR_LABELS: Record<string, string> = {
    NOT_AUTHENTICATED: 'Non authentifié.',
    NO_ROLE: 'Compte sans rôle pro.',
    ORDER_NOT_FOUND: 'Commande introuvable.',
    CONFECTION_NOT_COMPLETED: "Marquez d'abord la confection comme terminée.",
    SHIPMENT_ALREADY_EXISTS: 'Une livraison a déjà été lancée pour cette commande.',
    NO_COUTURIER_LINKED: 'Aucun couturier rattaché à cette commande.',
    NOT_YOUR_ORDER: 'Cette commande ne vous appartient pas.',
    CLIENT_NOT_AFFILIATED: "Client non affilié à votre compte d'agent.",
    FORBIDDEN_ROLE: 'Action non autorisée pour votre rôle.',
    MISSING_FIELDS: 'Champs manquants — complétez les profils concernés.',
    PAYLOAD_INVALID: 'Données invalides après assemblage du payload.',
    TASSI_API_ERROR: 'Erreur côté Tassi.',
    TASSI_OK_BUT_DB_FAILED: 'Tassi OK mais sauvegarde locale échouée — contactez un admin.',
    INTERNAL_ERROR: 'Erreur interne.',
}

export function LaunchDeliveryButton({
    orderId,
    confectionCompleted,
    shipmentAlreadyExists,
    missingFields = [],
    onSuccess,
}: LaunchDeliveryButtonProps) {
    const router = useRouter()
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)

    const disabled =
        !confectionCompleted || shipmentAlreadyExists || missingFields.length > 0 || loading

    let helper = ''
    if (!confectionCompleted) helper = "Marquez d'abord la confection comme terminée."
    else if (shipmentAlreadyExists) helper = 'Une livraison a déjà été lancée pour cette commande.'
    else if (missingFields.length > 0) {
        helper = `Champs manquants : ${missingFields.join(', ')}`
    }

    const onClick = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/tassi/shipments', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({orderId, notes: notes.trim() || undefined}),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                const code = json.error as string | undefined
                const label = code ? ERROR_LABELS[code] ?? code : 'Erreur inconnue'
                if (code === 'MISSING_FIELDS' && Array.isArray(json.details?.fields)) {
                    notify.error(label, json.details.fields.join(', '))
                } else {
                    notify.error(label, json.message ?? '')
                }
                return
            }
            notify.success('Livraison lancée', `Tassi shipment ${json.data?.id ?? ''}`)
            setNotes('')
            if (onSuccess) onSuccess()
            else router.refresh()
        } catch (err) {
            notify.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-3">
            <label className="block">
                <span className="text-sm font-medium text-black dark:text-white">
                    Note pour le transporteur (optionnel)
                </span>
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Ex. : Ne pas plier"
                    maxLength={500}
                    disabled={disabled}
                    rows={2}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white placeholder-gray-400 disabled:opacity-50 text-sm"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">{notes.length}/500</span>
            </label>

            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
                <PaperAirplaneIcon className="w-4 h-4" />
                {loading ? 'Lancement…' : 'Lancer la livraison'}
            </button>

            {helper && (
                <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-2.5">
                    <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{helper}</span>
                </p>
            )}
        </div>
    )
}
