'use server'

import {createSupabaseServiceClient} from '@/lib/supabase/service'
import {createSupabaseServerClient} from '@/lib/supabase/server'
import {getUserRole, isProfessionalRole} from '@/lib/roles'
import {notifyCouturierReminder} from '@/lib/notifications/orders'
import {ORDER_STATUS_LABELS_FR, type OrderStatus} from '@/types/order.types'

export async function resolveOrderProfessionalsAction(input: {modelIds: string[]}) {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) return {success: false, error: 'unauthorized', assignments: {} as Record<string, string>, professionalNames: {} as Record<string, string>}

    const role = getUserRole(user)
    if (!isProfessionalRole(role)) return {success: false, error: 'forbidden', assignments: {} as Record<string, string>, professionalNames: {} as Record<string, string>}

    const uniqueIds = [...new Set(input.modelIds.filter(Boolean))]
    if (uniqueIds.length === 0) {
        return {success: true as const, assignments: {} as Record<string, string>, professionalNames: {} as Record<string, string>}
    }

    const supabase = createSupabaseServiceClient()
    const {data, error} = await supabase
        .from('modeles')
        .select('id, professional_id')
        .in('id', uniqueIds)

    if (error) {
        return {success: false, error: error.message, assignments: {} as Record<string, string>, professionalNames: {} as Record<string, string>}
    }

    const assignments: Record<string, string> = {}
    const professionalIds = new Set<string>()
    for (const row of data ?? []) {
        if (row.professional_id) {
            assignments[row.id] = row.professional_id
            professionalIds.add(row.professional_id)
        }
    }

    // Load professional names from auth.users
    const professionalNames: Record<string, string> = {}
    if (professionalIds.size > 0) {
        const {data: users, error: usersError} = await supabase.auth.admin.listUsers()
        if (!usersError && users?.users) {
            for (const userId of professionalIds) {
                const authUser = users.users.find(u => u.id === userId)
                if (authUser) {
                    const name = authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Couturier'
                    professionalNames[userId] = name
                }
            }
        }
    }

    return {success: true as const, assignments, professionalNames}
}

export async function acceptCouturierSuggestionAction(input: {orderId: string; professionalId: string}) {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) return {success: false, error: 'unauthorized'}

    const role = getUserRole(user)
    if (!isProfessionalRole(role) || role !== 'admin') return {success: false, error: 'forbidden'}

    const supabase = createSupabaseServiceClient()
    const {data, error} = await supabase
        .from('orders')
        .update({professional_id: input.professionalId})
        .eq('id', input.orderId)
        .select('*')
        .single()

    if (error) return {success: false, error: error.message}
    return {success: true as const, order: data}
}

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

export async function claimOrderByCouturierAction(input: {orderNumber: string; couturierPhone: string}) {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) return {success: false, error: 'unauthorized'}

    const role = getUserRole(user)
    if (!isProfessionalRole(role) || role !== 'couturier') return {success: false, error: 'forbidden'}

    const supabase = createSupabaseServiceClient()

    // Retrieve order by orderNumber
    const {data: orderData, error: orderError} = await supabase
        .from('orders')
        .select('id, model_id, professional_id, modelName')
        .eq('orderNumber', input.orderNumber)
        .maybeSingle()

    if (orderError || !orderData) {
        return {success: false, error: 'order_not_found'}
    }

    // Retrieve couturier user from auth.users by phone
    const {data: authData, error: authError} = await supabase.auth.admin.listUsers()
    if (authError || !authData.users) {
        return {success: false, error: 'auth_list_failed'}
    }

    const couturierUser = authData.users.find(
        u => u.phone && u.phone.trim() === input.couturierPhone.trim()
    )
    if (!couturierUser) {
        return {success: false, error: 'couturier_not_found'}
    }

    // Verify that the couturier's model matches the order's model_id
    if (orderData.model_id) {
        const {data: modelData, error: modelError} = await supabase
            .from('modeles')
            .select('professional_id')
            .eq('id', orderData.model_id)
            .maybeSingle()

        if (!modelError && modelData?.professional_id !== couturierUser.id) {
            return {success: false, error: 'couturier_not_owner_of_model'}
        }
    }

    // Assign order to couturier only if not already assigned
    if (orderData.professional_id && orderData.professional_id !== couturierUser.id) {
        return {success: false, error: 'order_already_assigned'}
    }

    const {data: updated, error: updateError} = await supabase
        .from('orders')
        .update({professional_id: couturierUser.id})
        .eq('id', orderData.id)
        .select('*')
        .single()

    if (updateError || !updated) {
        return {success: false, error: 'update_failed'}
    }

    // Send confirmation message to couturier
    const couturierName = couturierUser.user_metadata?.name as string | undefined
    const confirmationMsg = `DressArt: ✅ Vous avez accepté la commande #${input.orderNumber}. ${couturierName || 'Couturier'},merci de démarrer les préparatifs!`

    // Fire-and-forget notification (don't await)
    void (async () => {
        try {
            const {normalizePhoneForEvolution} = await import('@/lib/evolution-api')
            const normalizedPhone = normalizePhoneForEvolution(input.couturierPhone)
            const {sendWhatsAppText} = await import('@/lib/evolution-api')
            await sendWhatsAppText(normalizedPhone, confirmationMsg)
        } catch (err) {
            console.error('Failed to send claim confirmation:', err)
        }
    })()

    return {success: true as const, order: updated}
}

export async function revokeCouturierSuggestionAction(input: {orderId: string}) {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) return {success: false, error: 'unauthorized'}

    const role = getUserRole(user)
    if (!isProfessionalRole(role) || role !== 'admin') return {success: false, error: 'forbidden'}

    const supabase = createSupabaseServiceClient()
    const {data, error} = await supabase
        .from('orders')
        .update({professional_id: null})
        .eq('id', input.orderId)
        .select('*')
        .single()

    if (error) return {success: false, error: error.message}
    return {success: true as const, order: data}
}

export async function listCouturiersAction() {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) return {success: false, error: 'unauthorized', couturiers: [] as Array<{id: string; name: string; email: string}>}

    const role = getUserRole(user)
    if (!isProfessionalRole(role)) return {success: false, error: 'forbidden', couturiers: [] as Array<{id: string; name: string; email: string}>}

    const supabase = createSupabaseServiceClient()
    const {data, error} = await supabase.auth.admin.listUsers()

    if (error || !data?.users) {
        return {success: false, error: error?.message || 'Failed to list users', couturiers: [] as Array<{id: string; name: string; email: string}>}
    }

    const couturiers = data.users
        .filter((u) => getUserRole(u) === 'couturier' && u.id && (u.email || u.phone))
        .map((u) => ({
            id: u.id,
            name: (u.user_metadata?.name as string | undefined) ?? u.email?.split('@')[0] ?? 'Couturier',
            email: u.email ?? u.phone ?? '',
        }))

    return {success: true as const, couturiers}
}

export async function manualAssignCouturierAction(input: {orderId: string; couturierId: string}) {
    const sessionClient = await createSupabaseServerClient()
    const {data: {user}} = await sessionClient.auth.getUser()
    if (!user) return {success: false, error: 'unauthorized'}

    const role = getUserRole(user)
    if (!isProfessionalRole(role) || role !== 'admin') return {success: false, error: 'forbidden'}

    const supabase = createSupabaseServiceClient()

    // Verify that couturierId exists and is a couturier
    const {data: couturierData, error: couturierError} = await supabase.auth.admin.getUserById(input.couturierId)
    if (couturierError || !couturierData.user) {
        return {success: false, error: 'couturier_not_found'}
    }

    const couturierRole = getUserRole(couturierData.user)
    if (couturierRole !== 'couturier') {
        return {success: false, error: 'user_is_not_couturier'}
    }

    // Update order with new professional_id
    const {data: updated, error: updateError} = await supabase
        .from('orders')
        .update({professional_id: input.couturierId})
        .eq('id', input.orderId)
        .select('*')
        .single()

    if (updateError || !updated) {
        return {success: false, error: updateError?.message || 'Failed to assign'}
    }

    // Send welcome message to couturier
    const couturierPhone = couturierData.user.phone
    if (couturierPhone) {
        void (async () => {
            try {
                const {normalizePhoneForEvolution, sendWhatsAppText} = await import('@/lib/evolution-api')
                const normalizedPhone = normalizePhoneForEvolution(couturierPhone)
                const couturierName = couturierData.user.user_metadata?.name as string | undefined
                const couturierContactName = couturierName ? ` ${couturierName}` : ''
                await sendWhatsAppText(
                    normalizedPhone,
                    `DressArt: Bonjour${couturierContactName}, une nouvelle commande vous a été assignée. Veuillez démarrer les préparatifs. Merci!`,
                )
            } catch (err) {
                console.error('Failed to send assignment notification:', err)
            }
        })()
    }

    return {success: true as const, order: updated}
}

