import {DashboardLayout} from '@/components/layout/DashboardLayout'
import {createSupabaseServerClient} from '@/lib/supabase/server'
import {MeDeliveriesPage} from '@/modules/delivery/MeDeliveriesPage'

export default async function Page() {
    const supabase = await createSupabaseServerClient()
    const {data: {user}} = await supabase.auth.getUser()

    if (!user) {
        return null
    }

    return (
        <DashboardLayout>
            <MeDeliveriesPage driverId={user.id} />
        </DashboardLayout>
    )
}
