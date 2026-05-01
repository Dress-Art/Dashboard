'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations} from 'next-intl'
import {useEffect, useState} from 'react'
import dayjs from 'dayjs'
import {useApi, type EventEntity} from '@/lib/useApi'

interface CalendarWidgetProps {
    q?: string
    dateFrom?: string
    dateTo?: string
    pageSize?: number
    refreshKey?: number
}

/**
 * CalendarWidget
 * Liste d'événements à venir via l'API centralisée `useApi().events.list`.
 * - i18n: titres via `widgets.calendar`, états via `pages.calendar`
 * - A11y: roles, aria-live pour le chargement/erreur
 * - Formatage: dayjs en `YYYY-MM-DD HH:mm`
 */
export function CalendarWidget(props: CalendarWidgetProps) {
    const tWidget = useTranslations('widgets.calendar')
    const tPage = useTranslations('pages.calendar')
    const api = useApi()
    const [events, setEvents] = useState<EventEntity[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        async function fetchEvents() {
            try {
                setIsLoading(true)
                setError(null)
                const res = await api.events.list({
                    q: props.q,
                    dateFrom: props.dateFrom,
                    dateTo: props.dateTo,
                    page: 1,
                    pageSize: props.pageSize ?? 5,
                    order: 'asc',
                })
                if (!cancelled) setEvents(res.items)
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Error')
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        fetchEvents()
        return () => {
            cancelled = true
        }
    }, [
        api.events,
        props.q,
        props.dateFrom,
        props.dateTo,
        props.pageSize,
        props.refreshKey,
    ])

    return (
        <WidgetCard id='module-calendar' title={tWidget('title')}>
            {isLoading ? (
                <p role='status' aria-live='polite' className='text-sm text-white/70'>
                    {tPage('loading')}
                </p>
            ) : error ? (
                <p role='alert' className='text-sm text-red-400'>
                    {tPage('error')}
                </p>
            ) : events.length === 0 ? (
                <p className='text-sm text-white/70'>{tPage('noResults')}</p>
            ) : (
                <ul role='list' aria-busy={isLoading} className='space-y-3'>
                    {events.map(e => (
                        <li key={e.id} role='listitem' className='rounded-md bg-white/5 p-4'>
                            <p className='text-sm font-medium'>{e.title}</p>
                            <p className='text-xs text-white/70'>
                                {dayjs(e.time).format('YYYY-MM-DD HH:mm')}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </WidgetCard>
    )
}

