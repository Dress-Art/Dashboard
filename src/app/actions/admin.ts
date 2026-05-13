'use server'

import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUserRole, isProfessionalRole } from '@/lib/roles'

export async function updateCouturierPhoneAction(input: { couturierId: string; phone: string }) {
    const sessionClient = await createSupabaseServerClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) return { success: false, error: 'unauthorized' }

    const role = getUserRole(user)
    if (!isProfessionalRole(role) || role !== 'admin') {
        return { success: false, error: 'forbidden' }
    }

    const supabase = createSupabaseServiceClient()

    // Update couturier phone via admin API
    const { data, error } = await supabase.auth.admin.updateUserById(input.couturierId, {
        phone: input.phone,
    })

    if (error || !data.user) {
        console.error('updateCouturierPhone failed', { couturierId: input.couturierId, error })
        return { success: false, error: error?.message || 'Failed to update phone' }
    }

    return { success: true as const, user: data.user }
}
