import 'server-only'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for notification helpers')
}

if (!SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for notification helpers')
}

async function invokeFunction(fnName: string, body: object) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(body),
    })

    if (!res.ok) {
        const errorText = await res.text().catch(() => '')
        throw new Error(`[notifications] ${fnName} failed: ${errorText || res.status}`)
    }

    return res.json()
}

export const notify = {
    couturierReminder: (couturierPhone: string, couturierName: string | null | undefined, orderNumber: string, modelName: string, statusLabel: string) =>
        invokeFunction('notify-couturier', {
            event: 'order.reminder',
            payload: {couturierPhone, couturierName, orderNumber, modelName, statusLabel},
        }),

    orderConfirmed: (clientPhone: string, orderId: string, couturierName: string) =>
        invokeFunction('notify-client', {
            event: 'order.confirmed',
            payload: {clientPhone, orderId, couturierName},
        }),

    agentBooked: (clientPhone: string, orderId: string, appointmentDate: string, appointmentTime: string) =>
        invokeFunction('notify-client', {
            event: 'agent.appointment.booked',
            payload: {clientPhone, orderId, appointmentDate, appointmentTime},
        }),

    orderInProgress: (clientPhone: string, orderId: string, couturierName: string, estimatedDays: number) =>
        invokeFunction('notify-client', {
            event: 'order.in_progress',
            payload: {clientPhone, orderId, couturierName, estimatedDays},
        }),

    orderReady: (clientPhone: string, orderId: string, couturierName: string) =>
        invokeFunction('notify-client', {
            event: 'order.ready',
            payload: {clientPhone, orderId, couturierName},
        }),

    newOrderToCouturier: (
        couturierPhone: string,
        orderId: string,
        clientName: string,
        modelName: string,
        measurementMethod: 'self' | 'agent',
    ) =>
        invokeFunction('notify-couturier', {
            event: 'order.new',
            payload: {couturierPhone, orderId, clientName, modelName, measurementMethod},
        }),

    measuresReceived: (couturierPhone: string, orderId: string, clientName: string) =>
        invokeFunction('notify-couturier', {
            event: 'measures.received',
            payload: {couturierPhone, orderId, clientName},
        }),

    agentMeasuresTransmitted: (couturierPhone: string, orderId: string, clientName: string) =>
        invokeFunction('notify-couturier', {
            event: 'agent.measures.transmitted',
            payload: {couturierPhone, orderId, clientName},
        }),
}
