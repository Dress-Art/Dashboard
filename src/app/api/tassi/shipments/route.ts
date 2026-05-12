import {NextRequest, NextResponse} from 'next/server'
import {randomUUID} from 'node:crypto'
import {z} from 'zod'
import {tassi} from '@/lib/tassi/client'
import {TassiApiError, describeTassiError} from '@/lib/tassi/errors'
import {
    buildShipmentPayloadFromOrder,
    ShipmentBuildError,
    type ClientDelivery,
    type CouturierShop,
    type OrderForBuild,
} from '@/services/shipments.service'
import {assertCanLaunchDelivery, getProSession, HttpError} from '@/lib/auth/guards'
import {createSupabaseServiceClient} from '@/lib/supabase/service'

/**
 * `POST /api/tassi/shipments` — création one-click.
 *
 * Spec §6.5. Body minimal : `{ orderId, notes? }`. Le serveur fait tout :
 *   1. Garde d'autorisation (rôle, ownership, confection terminée, anti-doublon)
 *   2. Récupère order + couturier (auth.users.app_metadata.shop) + client
 *      (depuis `clients` ou `auth.users` selon source de la commande)
 *   3. Construit le payload via le service
 *   4. POST /v1/shipments avec Idempotency-Key
 *   5. Persiste dans `tassi_shipments`
 *
 * Note schéma : la spec assume un `users.shop_*` flat. Notre Supabase stocke
 * ces infos dans `auth.users.app_metadata.shop` (jsonb). Le mapping est fait ici.
 */
export const runtime = 'nodejs'

const InputSchema = z.object({
    orderId: z.uuid(),
    notes: z.string().max(500).optional(),
})

// NB : on lit désormais le shop depuis `professional_profiles`, plus depuis
// `auth.users.app_metadata.shop` (cf. fix bug d'ID croisé). L'ancienne
// interface AuthUserMetadataShop a été retirée.

export async function POST(req: NextRequest) {
    try {
        const session = await getProSession()
        const body = InputSchema.parse(await req.json())
        // Service role : la garde `assertCanLaunchDelivery` + `getProSession()`
        // valident l'identité et le rôle. Pour les lectures (orders, modeles,
        // auth.admin.getUserById) et l'insert (tassi_shipments), on bypass RLS.
        const supabase = createSupabaseServiceClient()

        // 1. Charger la commande (avec couturier_id, agent_id, confection)
        const {data: orderRow, error: orderErr} = await supabase
            .from('orders')
            .select(
                'id, user_id, customer_name, customer_phone, customer_email, location, specific_location, couturier_confection_completed_at, agent_id',
            )
            .eq('id', body.orderId)
            .maybeSingle()

        if (orderErr || !orderRow) {
            throw new HttpError(404, 'ORDER_NOT_FOUND')
        }

        // Chaîne de résolution couturier :
        //   orders.model_id → modeles.professional_id (= professional_profiles.id)
        //                  → professional_profiles.user_id (= auth.users.id)
        // On stocke `couturier_id` côté tassi_shipments en `auth.users.id`
        // (couturierUserId) pour rester cohérent avec les FK.
        const {data: modelRow} = await supabase
            .from('orders')
            .select('model_id, modeles:model_id(professional_id)')
            .eq('id', body.orderId)
            .maybeSingle<{
                model_id: string | null
                modeles: {professional_id: string | null} | null
            }>()

        const professionalProfileId = modelRow?.modeles?.professional_id ?? null
        if (!professionalProfileId) {
            throw new HttpError(409, 'NO_COUTURIER_LINKED')
        }

        const {data: profile, error: profileErr} = await supabase
            .from('professional_profiles')
            .select('user_id, business_name, phone_number, workshop_address, workshop_city, workshop_country')
            .eq('id', professionalProfileId)
            .maybeSingle<{
                user_id: string
                business_name: string | null
                phone_number: string | null
                workshop_address: string | null
                workshop_city: string | null
                workshop_country: string | null
            }>()
        if (profileErr || !profile) {
            throw new HttpError(409, 'COUTURIER_PROFILE_NOT_FOUND')
        }
        const couturierUserId = profile.user_id

        const orderForGuard: OrderForBuild & {agent_id: string | null} = {
            id: orderRow.id,
            couturier_id: couturierUserId,
            agent_id: orderRow.agent_id ?? null,
            couturier_confection_completed_at: orderRow.couturier_confection_completed_at,
        }
        await assertCanLaunchDelivery(session, orderForGuard)

        const couturier: CouturierShop = {
            name: profile.business_name,
            phone: profile.phone_number,
            address_line1: profile.workshop_address,
            address_city: profile.workshop_city,
            address_zip: null,
            address_country: profile.workshop_country,
        }

        // Le client : on privilégie les snapshots `orders.customer_*` (spec : snapshot
        // qui résiste aux modifs ultérieures). Pays depuis `orders.location` (à mapper).
        const client: ClientDelivery = {
            full_name: orderRow.customer_name,
            phone: orderRow.customer_phone,
            address_line1: orderRow.specific_location ?? orderRow.location ?? null,
            address_city: orderRow.location ?? null,
            address_zip: null,
            // Bénin par défaut (DressArt principalement local). À rendre paramétrable.
            address_country: 'BJ',
        }

        // 3. Construire le payload pour `.pro/packages` (format réel observé).
        //
        // La spec officielle Tassi décrit un format imbriqué
        // ({parcel, origin, destination, mode, client_reference, ...}) qui
        // correspond à `.com/v1/shipments` (n'existe pas en DNS). L'endpoint
        // live `.pro/packages` attend un format plat avec :
        //   - customer (FK ou inline ?)
        //   - weight (number, top-level)
        //   + d'autres champs à découvrir au fil des erreurs 400.
        //
        // Phase 1 (current) : on tente avec `customer` INLINE pour voir si
        // Tassi auto-crée le customer. Si on récupère encore "Customer doit
        // exister", on bascule sur findOrCreateCustomer en Phase 2.
        const nameParts = (client.full_name ?? '').trim().split(/\s+/)
        const firstName = nameParts[0] || 'Client'
        const lastName = nameParts.slice(1).join(' ') || ''
        const weight = Number(process.env.DRESSART_PARCEL_DEFAULT_WEIGHT_KG ?? 1.0)

        // Construire aussi le payload SPEC pour validation interne + debug
        // (sans l'envoyer à Tassi — c'est pour vérifier que nos données sont OK).
        try {
            buildShipmentPayloadFromOrder(orderForGuard, couturier, client, {notes: body.notes})
        } catch (specErr) {
            if (specErr instanceof ShipmentBuildError) {
                throw specErr
            }
        }

        const packagePayload = {
            customer: {
                phone_number: client.phone,
                first_name: firstName,
                last_name: lastName,
                email: orderRow.customer_email ?? undefined,
            },
            weight,
            description: `Tenue Dress Art - Commande #${orderForGuard.id}`,
            external_id: orderForGuard.id,
            ...(body.notes ? {notes: body.notes} : {}),
        }
        console.log('[POST /api/tassi/shipments] payload .pro/packages:', JSON.stringify(packagePayload))

        // 4. POST Tassi avec idempotency
        const idempotencyKey = randomUUID()
        // On utilise le client `tassi.shipments.create` mais en passant le
        // payload .pro/packages directement (le client envoie tel quel).
        const {data: shipment} = await tassi.shipments.create(
            packagePayload as unknown as Parameters<typeof tassi.shipments.create>[0],
            {idempotencyKey},
        )

        // 5. Persister dans tassi_shipments
        const {error: insertErr} = await supabase.from('tassi_shipments').insert({
            tassi_id: shipment.id,
            client_reference: orderForGuard.id,
            order_id: orderForGuard.id,
            couturier_id: couturierUserId,
            agent_id: orderForGuard.agent_id,
            created_by_user_id: session.userId,
            created_by_role: session.role,
            tassi_status: shipment.status,
            tassi_status_history: [{status: shipment.status, at: new Date().toISOString()}],
            delivery_status: 'shipping_created',
            couturier_notes: body.notes ?? null,
            next_poll_at: new Date(Date.now() + 60_000).toISOString(),
            raw_payload: shipment as unknown as Record<string, unknown>,
        })

        if (insertErr) {
            console.error('[POST /api/tassi/shipments] insert failed', insertErr)
            // Tassi a déjà accepté l'idempotency key. Si l'insert local échoue,
            // remonter clairement pour permettre une retry humaine côté admin.
            return NextResponse.json(
                {
                    error: 'TASSI_OK_BUT_DB_FAILED',
                    tassi_id: shipment.id,
                    db_error: insertErr.message,
                },
                {status: 500},
            )
        }

        return NextResponse.json({data: shipment}, {status: 201})
    } catch (err) {
        if (err instanceof HttpError) {
            return NextResponse.json({error: err.code}, {status: err.status})
        }
        if (err instanceof ShipmentBuildError) {
            return NextResponse.json(
                {error: err.code, details: err.details ?? null},
                {status: 422},
            )
        }
        if (err instanceof TassiApiError) {
            // Log côté serveur le corps brut pour pouvoir le copier-coller en debug
            console.error('[POST /api/tassi/shipments] Tassi rejected:', {
                status: err.status,
                path: err.path,
                request_id: err.requestId,
                body: err.body,
            })
            return NextResponse.json(
                {
                    error: 'TASSI_API_ERROR',
                    message: describeTassiError(err),
                    // Body brut Tassi pour debug front (validation messages)
                    tassi_body: err.body,
                    tassi_status: err.status,
                    tassi_request_id: err.requestId,
                },
                {status: err.status >= 400 && err.status < 600 ? err.status : 502},
            )
        }
        if (err instanceof z.ZodError) {
            return NextResponse.json(
                {error: 'INVALID_BODY', issues: err.issues},
                {status: 400},
            )
        }
        console.error('[POST /api/tassi/shipments] unexpected', err)
        return NextResponse.json({error: 'INTERNAL_ERROR'}, {status: 500})
    }
}
