'use server'

import {createSupabaseServerClient} from '@/lib/supabase/server'
import {createSupabaseServiceClient} from '@/lib/supabase/service'
import {getUserRole, isProfessionalRole, type Role} from '@/lib/roles'

export interface AppointmentRow {
    orderId: string
    orderNumber: string | null
    customerName: string
    customerPhone: string | null
    appointmentDate: string
    location: string | null
    specificLocation: string | null
    status: string
    professionalId: string | null
}

export async function getUpcomingAppointmentsAction(params: {
    /** Fenêtre en jours après aujourd'hui (défaut 30). */
    days?: number
} = {}): Promise<
    | {success: true; appointments: AppointmentRow[]}
    | {success: false; error: string; appointments: AppointmentRow[]}
> {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) return {success: false, error: 'unauthorized', appointments: []}

    const role: Role | null = getUserRole(user)
    if (!isProfessionalRole(role)) return {success: false, error: 'forbidden', appointments: []}

    const supabase = createSupabaseServiceClient()
    const now = new Date().toISOString()
    const horizon = new Date(Date.now() + (params.days ?? 30) * 24 * 60 * 60 * 1000).toISOString()

    let query = supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_phone, appointment_date, location, specific_location, status, professional_id')
        .gte('appointment_date', now)
        .lte('appointment_date', horizon)
        .order('appointment_date', {ascending: true})

    // Non-admins ne voient que leurs propres RDV (couturier = celui assigné à
    // la commande). Admin voit tout.
    if (role !== 'admin') {
        query = query.eq('professional_id', user.id)
    }

    const {data, error} = await query
    if (error) {
        return {success: false, error: error.message, appointments: []}
    }

    const appointments: AppointmentRow[] = (data ?? []).map(row => ({
        orderId: row.id,
        orderNumber: row.order_number ?? null,
        customerName: row.customer_name ?? '',
        customerPhone: row.customer_phone ?? null,
        appointmentDate: row.appointment_date as string,
        location: row.location ?? null,
        specificLocation: row.specific_location ?? null,
        status: row.status ?? 'confirmed',
        professionalId: row.professional_id ?? null,
    }))

    return {success: true, appointments}
}
