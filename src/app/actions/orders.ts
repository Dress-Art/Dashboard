'use server'

import {createSupabaseServiceClient} from '@/lib/supabase/service'
import {createSupabaseServerClient} from '@/lib/supabase/server'
import {getUserRole, isProfessionalRole} from '@/lib/roles'
import {notifyCouturierReminder} from '@/lib/notifications/orders'
import {ORDER_STATUS_LABELS_FR, type OrderStatus} from '@/types/order.types'

export async function remindCouturierAction(input: {
    orderNumber: string
    professionalId: string | null | undefined
    modelName: string
    status: OrderStatus
}) {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) return {success: false, error: 'unauthorized'}

    const role = getUserRole(user)
    if (!isProfessionalRole(role) || role !== 'admin') return {success: false, error: 'forbidden'}

    if (!input.professionalId) return {success: false, error: 'no_couturier_linked'}

    const supabase = createSupabaseServiceClient()
    const {data, error} = await supabase.auth.admin.getUserById(input.professionalId)
    if (error || !data.user) {
        return {success: false, error: 'couturier_not_found'}
    }

    const couturierPhone = data.user.phone?.trim() || null
    if (!couturierPhone) {
        return {success: false, error: 'couturier_phone_missing'}
    }

    const couturierName = (data.user.user_metadata as {name?: string} | null)?.name ?? null

    const result = await notifyCouturierReminder({
        couturierPhone,
        couturierName,
        orderNumber: input.orderNumber,
        modelName: input.modelName,
        statusLabel: ORDER_STATUS_LABELS_FR[input.status],
    })

    if (!result.success && !result.skipped) {
        return {success: false, error: result.error ?? 'whatsapp_failed'}
    }

    return {success: true as const, skipped: result.skipped ?? null}
}
