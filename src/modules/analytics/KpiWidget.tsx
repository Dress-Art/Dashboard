'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations, useLocale} from 'next-intl'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {useApi} from '@/lib/useApi'
import type {AnalyticsKpisMetrics} from '@/lib/useApi'
import {Icon} from '@/lib/icons'

/**
 * KpiWidget
 * Affiche les KPIs (inscriptions, taux de conversion, taux de rebond,
 * durée moyenne de session) via useApi.analytics (mocked).
 * - i18n: `widgets.analytics.kpis.*`
 * - A11y: titre via WidgetCard, updatedAt avec aria-live
 */
export function KpiWidget() {
	const t = useTranslations('widgets.analytics.kpis')
	const locale = useLocale()
	const api = useApi()
	const [metrics, setMetrics] = useState<AnalyticsKpisMetrics | null>(null)

	useEffect(() => {
		let mounted = true
		api.analytics
			.getKpis()
			.then(m => {
				if (mounted) setMetrics(m)
			})
			.catch(() => {})
		return () => {
			mounted = false
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const handleRefresh = useCallback(async () => {
		try {
			const next = await api.analytics.refreshKpis()
			setMetrics(next)
		} catch {}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const updatedAtAbs = useMemo(() => {
		return metrics?.updatedAt
			? new Date(metrics.updatedAt).toLocaleString(locale)
			: '—'
	}, [metrics?.updatedAt, locale])

	return (
		<WidgetCard id='module-analytics-kpis' title={t('title')}>
			<div className='mb-6 flex items-center justify-between'>
				<p className='text-xs text-white/70' aria-live='polite'>
					{t('updatedAt')}: {' '}
					<span className='font-medium text-white/80'>
						{updatedAtAbs}
					</span>
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

			<ul className='grid grid-cols-1 gap-3 md:grid-cols-4' aria-label={t('title')}>
				<li className='rounded-md bg-white/5 p-3 border border-white/10'>
					<div className='flex items-center gap-2 text-white/80'>
						<Icon name='users' className='h-4 w-4' />
						<span className='text-xs'>{t('signups')}</span>
					</div>
					<p className='mt-2 text-lg font-semibold'>
						{(metrics?.signups ?? 0).toLocaleString(locale)}
					</p>
				</li>
				<li className='rounded-md bg-white/5 p-3 border border-white/10'>
					<div className='flex items-center gap-2 text-white/80'>
						<Icon name='check-circle' className='h-4 w-4' />
						<span className='text-xs'>{t('conversionRate')}</span>
					</div>
					<p className='mt-2 text-lg font-semibold'>
						{metrics?.conversionRatePct ?? 0}%
					</p>
				</li>
				<li className='rounded-md bg-white/5 p-3 border border-white/10'>
					<div className='flex items-center gap-2 text-white/80'>
						<Icon name='x-circle' className='h-4 w-4' />
						<span className='text-xs'>{t('bounceRate')}</span>
					</div>
					<p className='mt-2 text-lg font-semibold'>
						{metrics?.bounceRatePct ?? 0}%
					</p>
				</li>
				<li className='rounded-md bg-white/5 p-3 border border-white/10'>
					<div className='flex items-center gap-2 text-white/80'>
						<Icon name='clock' className='h-4 w-4' />
						<span className='text-xs'>{t('avgSession')}</span>
					</div>
					<p className='mt-2 text-lg font-semibold'>
						{metrics?.avgSessionMin ?? 0} {t('unitMin')}
					</p>
				</li>
			</ul>
		</WidgetCard>
	)
}
