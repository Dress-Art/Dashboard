'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations, useLocale} from 'next-intl'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {useApi} from '@/lib/useApi'
import type {AnalyticsMetrics} from '@/lib/useApi'
import {Icon} from '@/lib/icons'
import {Line} from 'react-chartjs-2'
import {CHART_CANVAS_CLASS, CHART_HEIGHT_CLASS} from '@/config/ui'
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Tooltip,
	Legend,
	type ChartData,
	type ChartOptions,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

/**
 * AnalyticsWidget
 * Graphique de trafic dynamique basé sur useApi.analytics (mocked).
 */
export function AnalyticsWidget() {
	const t = useTranslations('widgets.analytics')
	const locale = useLocale()
	const api = useApi()
	const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)

	useEffect(() => {
		let mounted = true
		api.analytics
			.getLastDays(7)
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
			const next = await api.analytics.refresh(7)
			setMetrics(next)
		} catch {}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const labels = useMemo(() => {
		return (metrics?.days ?? []).map(d =>
			new Date(d.date).toLocaleDateString(locale, {weekday: 'short'}),
		)
	}, [metrics?.days, locale])

	const data: ChartData<'line'> = useMemo(() => ({
		labels,
		datasets: [
			{
				label: t('visitors'),
				data: (metrics?.days ?? []).map(d => d.visitors),
				borderColor: 'rgb(59,130,246)',
				backgroundColor: 'rgba(59,130,246,0.2)',
				tension: 0.3,
			},
		],
	}), [labels, metrics?.days, t])

	const options: ChartOptions<'line'> = useMemo(() => ({
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {display: false},
		},
		scales: {
			y: {grid: {color: 'rgba(255,255,255,0.06)'}},
			x: {grid: {color: 'rgba(255,255,255,0.06)'}},
		},
	}), [])

	const updatedAtAbs = metrics?.updatedAt
		? new Date(metrics.updatedAt).toLocaleString(locale)
		: '—'

	return (
		<WidgetCard id='module-analytics' title={t('title')} className='h-full'>
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
			<div className={CHART_HEIGHT_CLASS}>
				<Line data={data} options={options} className={CHART_CANVAS_CLASS} />
			</div>
		</WidgetCard>
	)
}
