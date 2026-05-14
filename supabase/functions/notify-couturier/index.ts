import {serve} from 'https://deno.land/std@0.177.0/http/server.ts'
import {handlePreflight, jsonResponse, responses} from '../_shared/cors.ts'
import {
  msgAgentMeasuresTransmitted,
  msgCouturierReminder,
  msgMeasuresReceived,
  msgNewOrderForCouturier,
} from '../_shared/templates.ts'

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
