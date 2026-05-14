import {serve} from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function handlePreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {headers: corsHeaders})
  }
  return null
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const extraHeaders =
    init.headers instanceof Headers
      ? Object.fromEntries(init.headers.entries())
      : (init.headers as Record<string, string> | undefined) ?? {}
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  })
}

const responses = {
  ok: <T>(body: T): Response => jsonResponse(body, {status: 200}),
  created: <T>(body: T): Response => jsonResponse(body, {status: 201}),
  badRequest: (message: string, details?: unknown): Response =>
    jsonResponse({error: 'bad_request', message, details}, {status: 400}),
  unauthorized: (message = 'Unauthorized'): Response =>
    jsonResponse({error: 'unauthorized', message}, {status: 401}),
  forbidden: (message = 'Forbidden'): Response =>
    jsonResponse({error: 'forbidden', message}, {status: 403}),
  notFound: (message = 'Not found'): Response =>
    jsonResponse({error: 'not_found', message}, {status: 404}),
  methodNotAllowed: (allowed: string[]): Response =>
    jsonResponse(
      {error: 'method_not_allowed', allowed},
      {status: 405, headers: {Allow: allowed.join(', ')}},
    ),
  serverError: (message = 'Internal server error', details?: unknown): Response =>
    jsonResponse({error: 'server_error', message, details}, {status: 500}),
}

const BASE_URL = Deno.env.get('EVOLUTION_API_URL')!
const API_KEY = Deno.env.get('EVOLUTION_API_KEY')!
const INSTANCE = Deno.env.get('EVOLUTION_INSTANCE')!

async function sendText(to: string, text: string) {
  const res = await fetch(`${BASE_URL}/message/sendText/${INSTANCE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: API_KEY,
    },
    body: JSON.stringify({
      number: to,
      options: {
        delay: 500,
        presence: 'composing',
      },
      textMessage: {
        text,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Evolution API error: ${JSON.stringify(err)}`)
  }

  return res.json()
}

async function msgNewOrderForCouturier(
  phone: string,
  orderId: string,
  clientName: string,
  modelName: string,
  measurementMethod: 'self' | 'agent',
) {
  const measureNote =
    measurementMethod === 'agent'
      ? `📏 *Mesures : Agent programmé* — les mesures seront transmises après le RDV.`
      : `📏 *Mesures : Formulaire client* — les mesures sont disponibles dans votre espace.`

  return sendText(
    phone,
    `🛍️ *Nouvelle commande sur DressArt !*\n\n` +
      `Commande *#${orderId}*\n` +
      `Client : *${clientName}*\n` +
      `Modèle : *${modelName}*\n\n` +
      `${measureNote}\n\n` +
      `👉 Consultez le dossier : dressart.studio/vendeur/orders/${orderId}\n` +
      `_DressArt_`,
  )
}

async function msgMeasuresReceived(phone: string, orderId: string, clientName: string) {
  return sendText(
    phone,
    `📐 *Mesures reçues !*\n\n` +
      `*${clientName}* a soumis ses mesures pour la commande *#${orderId}*.\n\n` +
      `👉 Voir les mesures : dressart.studio/vendeur/orders/${orderId}\n` +
      `_DressArt_`,
  )
}

async function msgAgentMeasuresTransmitted(
  phone: string,
  orderId: string,
  clientName: string,
) {
  return sendText(
    phone,
    `📐 *Mesures agent disponibles !*\n\n` +
      `Les mesures de *${clientName}* ont été relevées pour la commande *#${orderId}*.\n\n` +
      `👉 Démarrer la confection : dressart.studio/vendeur/orders/${orderId}\n` +
      `_DressArt_`,
  )
}

async function msgCouturierReminder(
  phone: string,
  orderNumber: string,
  couturierName: string | null | undefined,
  modelName: string,
  statusLabel: string,
) {
  return sendText(
    phone,
    [
      `DressArt: rappel pour la commande ${orderNumber}.`,
      couturierName ? `Bonjour ${couturierName},` : null,
      `Modèle: ${modelName}`,
      `Statut actuel: ${statusLabel}`,
      'Merci de faire le point sur l\'avancement.',
    ]
      .filter(Boolean)
      .join('\n'),
  )
}

serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    const {event, payload} = await req.json()

    switch (event) {
      case 'order.new':
        await msgNewOrderForCouturier(
          payload.couturierPhone,
          payload.orderId,
          payload.clientName,
          payload.modelName,
          payload.measurementMethod,
        )
        break
      case 'measures.received':
        await msgMeasuresReceived(payload.couturierPhone, payload.orderId, payload.clientName)
        break
      case 'agent.measures.transmitted':
        await msgAgentMeasuresTransmitted(payload.couturierPhone, payload.orderId, payload.clientName)
        break
      case 'order.reminder':
        await msgCouturierReminder(
          payload.couturierPhone,
          payload.orderNumber,
          payload.couturierName,
          payload.modelName,
          payload.statusLabel,
        )
        break
      default:
        return responses.badRequest(`Event "${event}" non géré`)
    }

    return jsonResponse({ok: true, event}, {status: 200})
  } catch (err) {
    console.error('[notify-couturier]', err)
    return responses.serverError(err instanceof Error ? err.message : 'unknown_error')
  }
})
