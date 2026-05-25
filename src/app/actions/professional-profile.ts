'use server'

import {createSupabaseServerClient} from '@/lib/supabase/server'
import {getUserRole, isProfessionalRole} from '@/lib/roles'

export interface ProfessionalProfile {
    id: string | null
    user_id: string
    business_name: string | null
    bio: string | null
    specialties: string[]
    years_experience: number | null
    portfolio_images: string[]
    certifications: string[]
    base_rate: number | null
    accepts_custom_orders: boolean
    delivery_time_days: number | null
    workshop_address: string | null
    workshop_city: string | null
    workshop_country: string | null
    phone_number: string | null
    is_accepting_orders: boolean
    max_orders_per_month: number | null
    total_orders: number
    average_rating: number
    total_reviews: number
}

const EMPTY: Omit<ProfessionalProfile, 'user_id'> = {
    id: null,
    business_name: null,
    bio: null,
    specialties: [],
    years_experience: null,
    portfolio_images: [],
    certifications: [],
    base_rate: null,
    accepts_custom_orders: true,
    delivery_time_days: null,
    workshop_address: null,
    workshop_city: null,
    workshop_country: 'BJ',
    phone_number: null,
    is_accepting_orders: true,
    max_orders_per_month: null,
    total_orders: 0,
    average_rating: 0,
    total_reviews: 0,
}

export async function getMyProfileAction(): Promise<
    | {success: true; profile: ProfessionalProfile}
    | {success: false; error: string; profile: ProfessionalProfile | null}
> {
    const supabase = await createSupabaseServerClient()
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) return {success: false, error: 'unauthorized', profile: null}

    const role = getUserRole(user)
    if (!isProfessionalRole(role)) {
        return {success: false, error: 'forbidden', profile: null}
    }

    const {data, error} = await supabase
        .from('professional_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

    if (error) return {success: false, error: error.message, profile: null}

    if (!data) {
        // Le profil n'existe pas encore : on renvoie un squelette pour pré-remplir le form.
        return {success: true, profile: {...EMPTY, user_id: user.id}}
    }

    return {
        success: true,
        profile: {
            id: data.id as string,
            user_id: data.user_id as string,
            business_name: (data.business_name as string | null) ?? null,
            bio: (data.bio as string | null) ?? null,
            specialties: (data.specialties as string[] | null) ?? [],
            years_experience: (data.years_experience as number | null) ?? null,
            portfolio_images: (data.portfolio_images as string[] | null) ?? [],
            certifications: (data.certifications as string[] | null) ?? [],
            base_rate: (data.base_rate as number | null) ?? null,
            accepts_custom_orders: Boolean(data.accepts_custom_orders ?? true),
            delivery_time_days: (data.delivery_time_days as number | null) ?? null,
            workshop_address: (data.workshop_address as string | null) ?? null,
            workshop_city: (data.workshop_city as string | null) ?? null,
            workshop_country: (data.workshop_country as string | null) ?? 'BJ',
            phone_number: (data.phone_number as string | null) ?? null,
            is_accepting_orders: Boolean(data.is_accepting_orders ?? true),
            max_orders_per_month: (data.max_orders_per_month as number | null) ?? null,
            total_orders: (data.total_orders as number | null) ?? 0,
            average_rating: Number(data.average_rating ?? 0),
            total_reviews: (data.total_reviews as number | null) ?? 0,
        },
    }
}

export async function upsertMyProfileAction(input: {
    business_name?: string | null
    bio?: string | null
    specialties?: string[]
    years_experience?: number | null
    base_rate?: number | null
    accepts_custom_orders?: boolean
    delivery_time_days?: number | null
    workshop_address?: string | null
    workshop_city?: string | null
    workshop_country?: string | null
    phone_number?: string | null
    is_accepting_orders?: boolean
    max_orders_per_month?: number | null
}): Promise<{success: boolean; error?: string}> {
    const supabase = await createSupabaseServerClient()
    const {data: {user}} = await supabase.auth.getUser()
    if (!user) return {success: false, error: 'unauthorized'}

    const role = getUserRole(user)
    if (!isProfessionalRole(role)) return {success: false, error: 'forbidden'}

    // upsert sur user_id (UNIQUE) → insert si absent, update sinon.
    const {error} = await supabase
        .from('professional_profiles')
        .upsert(
            {
                user_id: user.id,
                business_name: input.business_name ?? null,
                bio: input.bio ?? null,
                specialties: input.specialties ?? [],
                years_experience: input.years_experience ?? null,
                base_rate: input.base_rate ?? null,
                accepts_custom_orders: input.accepts_custom_orders ?? true,
                delivery_time_days: input.delivery_time_days ?? null,
                workshop_address: input.workshop_address ?? null,
                workshop_city: input.workshop_city ?? null,
                workshop_country: input.workshop_country ?? 'BJ',
                phone_number: input.phone_number ?? null,
                is_accepting_orders: input.is_accepting_orders ?? true,
                max_orders_per_month: input.max_orders_per_month ?? null,
            },
            {onConflict: 'user_id'},
        )

    if (error) return {success: false, error: error.message}
    return {success: true}
}
