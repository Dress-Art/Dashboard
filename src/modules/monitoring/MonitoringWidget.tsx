'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations, useLocale} from 'next-intl'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {useCallback, useEffect, useState} from 'react'
import {useApi} from '@/lib/useApi'
import type {MonitoringMetrics} from '@/lib/useApi'
import {Icon} from '@/lib/icons'

/**
 * MonitoringWidget
 * Indicateurs système simples (CPU, Mémoire) mockés, déterministes.
 */
export function MonitoringWidget() {
	const t = useTranslations('widgets.monitoring')
	const locale = useLocale()
	const api = useApi()
	const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null)
	const [, setTick] = useState(0)

	dayjs.extend(relativeTime)
	const effectiveLocale = locale.toLowerCase().split('-')[0] === 'fr'
		? 'fr'
		: 'en'

	useEffect(() => {
		let ignore = false
		async function load() {
			if (effectiveLocale === 'fr') {
				await import('dayjs/locale/fr')
			} else {
				await import('dayjs/locale/en')
			}
			if (!ignore) dayjs.locale(effectiveLocale)
		}
		load()
		return () => {
			ignore = true
		}
	}, [effectiveLocale])

	// Tick périodique pour recalculer le relatif (sans action utilisateur)
	useEffect(() => {
		const id = setInterval(() => setTick(t => t + 1), 60_000)
		return () => clearInterval(id)
	}, [])

	useEffect(() => {
		let mounted = true
		api.monitoring
			.get()
			.then(m => {
				if (mounted) setMetrics(m)
			})
			.catch(() => {
				// garder silencieux pour mock
			})
		return () => {
			mounted = false
		}
	// On ne met pas `api` en dépendance car son identité n'est pas stable et
	// relancerait l'effet après chaque rendu, écrasant les données rafraîchies.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const cpu = metrics?.cpu ?? 0
	const memory = metrics?.memoryMb ?? 0
	const updatedAtAbs = metrics?.updatedAt
		? new Date(metrics.updatedAt).toLocaleString(locale)
		: '—'
	const updatedAtRel = metrics?.updatedAt
		? dayjs(metrics.updatedAt).locale(effectiveLocale).fromNow()
		: null
	const handleRefresh = useCallback(async () => {
		try {
			const next = await api.monitoring.refresh()
			setMetrics(next)
		} catch {
			// silencieux pour mock
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])
	return (
		<WidgetCard id='module-monitoring' title={t('title')}>
			<div className='mb-6 flex items-center justify-between'>
				<p className='text-xs text-white/70' aria-live='polite'>
					{t('updatedAt')}: {' '}
					<span className='font-medium text-white/80'>
						{updatedAtAbs}
					</span>
					{updatedAtRel ? (
						<span className='ml-2 text-white/60'>
							({updatedAtRel})
						</span>
					) : null}
				</p>
				<button
					type='button'
					onClick={handleRefresh}
					aria-label={t('refresh')}
					className='inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs hover:opacity-80'
				>
					<Icon name='arrow-uturn-left' className='h-4 w-4' />
					{t('refresh')}
				</button>
			</div>
			<div className='grid grid-cols-2 gap-4'>
				<div className='rounded-md bg-white/5 p-4'>
					<p className='text-xs text-white/70'>{t('cpu')}</p>
					<p className='text-lg font-semibold'>{cpu}%</p>
				</div>
				<div className='rounded-md bg-white/5 p-4'>
					<p className='text-xs text-white/70'>{t('memory')}</p>
					<p className='text-lg font-semibold'>{memory} {t('unitMb')}</p>
				</div>
			</div>
		</WidgetCard>
	)
}
