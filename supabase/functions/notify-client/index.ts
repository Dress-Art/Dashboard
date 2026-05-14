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

async function msgOrderConfirmed(phone: string, orderId: string, couturierName: string) {
  return sendText(
    phone,
    `✅ *Commande #${orderId} confirmée !*\n\n` +
      `Bonjour 👋 Votre paiement a bien été reçu.\n` +
      `Votre tenue est entre les mains de *${couturierName}*.\n\n` +
      `📱 Suivez l'avancement : dressart.studio/orders/${orderId}\n` +
      `_L'équipe DressArt_`,
  )
}

async function msgAgentAppointmentBooked(
  phone: string,
  orderId: string,
  appointmentDate: string,
  appointmentTime: string,
) {
  return sendText(
    phone,
    `📏 *Rendez-vous de mesures confirmé*\n\n` +
      `Commande *#${orderId}*\n` +
      `📅 *${appointmentDate}* à *${appointmentTime}*\n\n` +
      `Notre agent se déplacera chez vous pour prendre vos mesures.\n` +
      `_En cas d'empêchement, contactez-nous au plus tôt._\n\n` +
      `_DressArt_`,
  )
}

async function msgOrderInProgress(
  phone: string,
  orderId: string,
  couturierName: string,
  estimatedDays: number,
) {
  return sendText(
    phone,
    `🪡 *Votre tenue est en confection !*\n\n` +
      `Commande *#${orderId}* — ${couturierName}\n` +
      `⏱ Délai estimé : *${estimatedDays} jours*\n\n` +
      `Nous vous prévenons dès qu'elle est prête 🎉\n` +
      `_DressArt_`,
  )
}

async function msgOrderReady(phone: string, orderId: string, couturierName: string) {
  return sendText(
    phone,
    `🎉 *Votre tenue est prête !*\n\n` +
      `Commande *#${orderId}*\n` +
      `Prenez contact avec *${couturierName}* pour la récupérer.\n\n` +
      `Merci de votre confiance 🙏\n` +
      `_DressArt_`,
  )
}

serve(async (req) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  try {
    const {event, payload} = await req.json()

    switch (event) {
      case 'order.confirmed':
        await msgOrderConfirmed(payload.clientPhone, payload.orderId, payload.couturierName)
        break
      case 'agent.appointment.booked':
        await msgAgentAppointmentBooked(
          payload.clientPhone,
          payload.orderId,
          payload.appointmentDate,
          payload.appointmentTime,
        )
        break
      case 'order.in_progress':
        await msgOrderInProgress(
          payload.clientPhone,
          payload.orderId,
          payload.couturierName,
          payload.estimatedDays,
        )
        break
      case 'order.ready':
        await msgOrderReady(payload.clientPhone, payload.orderId, payload.couturierName)
        break
      default:
        return responses.badRequest(`Event "${event}" non géré`)
    }

    return jsonResponse({ok: true, event}, {status: 200})
  } catch (err) {
    console.error('[notify-client]', err)
    return responses.serverError(err instanceof Error ? err.message : 'unknown_error')
  }
})
