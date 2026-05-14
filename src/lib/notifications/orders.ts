import 'server-only'

import {notify} from './index'
import {ORDER_STATUS_LABELS_FR, type OrderStatus} from '@/types/order.types'

interface OrderReminderInput {
    couturierPhone: string
    couturierName?: string | null
    orderNumber: string
    modelName: string
    statusLabel: string
}

export async function notifyCouturierReminder(input: OrderReminderInput) {
    return notify.couturierReminder(
        input.couturierPhone,
        input.couturierName,
        input.orderNumber,
        input.modelName,
        input.statusLabel,
    )
}
