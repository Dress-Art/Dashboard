'use server'

import {createSupabaseServerClient} from '@/lib/supabase/server'
import {tassiAPI, TassiApiError} from '@/lib/tassi-api'
import {getUserRole, isProfessionalRole} from '@/lib/roles'
import type {TassiCreatePackageInput, TassiPackage} from '@/types/tassi.types'

export interface CreateTassiShipmentResult {
    success: boolean
    error?: string
    tassi_package_id?: number | string
    tassi_shipment_id?: string
    tassi_tracking_number?: string
}

interface DeliveryRow {
    id: string
    customer_name: string
    customer_phone: string | null
    customer_address: string
    notes?: string | null
    tassi_shipment_id?: string | null
}

/**
 * Crée un colis Tassi (`POST /packages`) pour une livraison DressArt et
 * persiste les identifiants Tassi retournés (`tassi_shipment_id`,
 * `tassi_package_id`, `tassi_tracking_number`).
 *
 * Idempotence : si `delivery.tassi_shipment_id` est déjà défini, on n'appelle
 * pas Tassi une seconde fois.
 *
 * Erreurs renvoyées (champ `error`) :
 *   - 'unauthorized'        : pas de session ou rôle non pro
 *   - 'delivery_not_found'  : id introuvable
 *   - 'already_linked'      : déjà rattachée à un shipment Tassi
 *   - 'tassi_api_error'     : Tassi a renvoyé un code !ok (details + status)
 *   - 'db_update_failed'    : Tassi OK mais l'update DB a échoué
 *   - 'unexpected'          : exception inattendue
 */
export async function createTassiShipmentForDelivery(
    deliveryId: string,
): Promise<CreateTassiShipmentResult> {
    const supabase = await createSupabaseServerClient()
    const {data: {user}} = await supabase.auth.getUser()
    if (!user || !isProfessionalRole(getUserRole(user))) {
        return {success: false, error: 'unauthorized'}
    }

    const {data: delivery, error: fetchErr} = await supabase
        .from('deliveries')
        .select('id, customer_name, customer_phone, customer_address, notes, tassi_shipment_id')
        .eq('id', deliveryId)
        .single<DeliveryRow>()

    if (fetchErr || !delivery) {
        return {success: false, error: 'delivery_not_found'}
    }

    if (delivery.tassi_shipment_id) {
        return {
            success: false,
            error: 'already_linked',
            tassi_shipment_id: delivery.tassi_shipment_id,
        }
    }

    // Construire le payload Tassi à partir de la livraison
    const [firstName, ...rest] = (delivery.customer_name || '').trim().split(/\s+/)
    const lastName = rest.join(' ').trim() || undefined

    const input: TassiCreatePackageInput = {
        customer: {
            phone_number: delivery.customer_phone || '',
            first_name: firstName || delivery.customer_name || 'Client',
            ...(lastName ? {last_name: lastName} : {}),
            address: delivery.customer_address,
        },
        // Poids par défaut couture sur mesure (à rendre paramétrable plus tard via order)
        weight: 1,
        weight_unit: 'kg',
        external_id: delivery.id,
        destination_address: delivery.customer_address,
        ...(delivery.notes ? {notes: delivery.notes} : {}),
    }

    let pkg: TassiPackage
    try {
        const res = await tassiAPI.createPackage(input)
        pkg = res.package
    } catch (err) {
        if (err instanceof TassiApiError) {
            console.error('[tassi createPackage]', err.path, err.status, err.body)
            return {success: false, error: 'tassi_api_error', tassi_package_id: undefined}
        }
        console.error('[tassi createPackage] unexpected', err)
        return {success: false, error: 'unexpected'}
    }

    // Tassi peut renvoyer plusieurs identifiants. On extrait défensivement.
    const rawShipmentId =
        (pkg as unknown as {shipment_id?: string}).shipment_id ??
        (typeof pkg.id === 'string' ? pkg.id : undefined)
    const shipmentId = rawShipmentId ? String(rawShipmentId) : undefined
    const numericId = typeof pkg.id === 'number' ? pkg.id : undefined

    const updates: Record<string, unknown> = {
        tassi_payload: pkg as unknown as Record<string, unknown>,
    }
    if (shipmentId) updates.tassi_shipment_id = shipmentId
    if (numericId !== undefined) updates.tassi_package_id = numericId
    if (pkg.tracking_number) updates.tassi_tracking_number = pkg.tracking_number

    const {error: updateErr} = await supabase
        .from('deliveries')
        .update(updates)
        .eq('id', deliveryId)

    if (updateErr) {
        console.error('[tassi createPackage] db update failed', updateErr.message)
        return {
            success: false,
            error: 'db_update_failed',
            tassi_shipment_id: shipmentId,
            tassi_package_id: numericId,
            tassi_tracking_number: pkg.tracking_number,
        }
    }

    return {
        success: true,
        tassi_shipment_id: shipmentId,
        tassi_package_id: numericId,
        tassi_tracking_number: pkg.tracking_number,
    }
}
