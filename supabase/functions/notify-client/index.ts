import {serve} from 'https://deno.land/std@0.177.0/http/server.ts'
import {handlePreflight, jsonResponse, responses} from '../_shared/cors.ts'
import {
  msgAgentAppointmentBooked,
  msgOrderConfirmed,
  msgOrderInProgress,
  msgOrderReady,
} from '../_shared/templates.ts'

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
