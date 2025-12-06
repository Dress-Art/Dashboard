'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations, useLocale} from 'next-intl'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {useApi} from '@/lib/useApi'
import type {AnalyticsSourcesMetrics, SourceChannel} from '@/lib/useApi'
import {Icon} from '@/lib/icons'
import {Doughnut} from 'react-chartjs-2'
import {CHART_CANVAS_CLASS, CHART_HEIGHT_CLASS} from '@/config/ui'
import {
	Chart as ChartJS,
	ArcElement,
	Tooltip,
	Legend,
	type ChartData,
	type ChartOptions,
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

/**
 * SourcesBreakdownWidget
 * Affiche un donut des sources de trafic sur N jours via useApi.analytics.
 * - i18n: `widgets.analytics.sources.*`
 * - A11y: titre via WidgetCard, updatedAt avec aria-live, légende listée
 */
export function SourcesBreakdownWidget() {
	const t = useTranslations('widgets.analytics.sources')
	const locale = useLocale()
	const api = useApi()
	const [metrics, setMetrics] = useState<AnalyticsSourcesMetrics | null>(null)

	useEffect(() => {
		let mounted = true
		api.analytics
			.getSourcesBreakdown(7)
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
			const next = await api.analytics.refreshSourcesBreakdown(7)
			setMetrics(next)
		} catch {}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const channelLabel = useCallback(
		(ch: SourceChannel) => t(`channels.${ch}`),
		[t],
	)

	const labels = useMemo(() => {
		return (metrics?.items ?? []).map(i => channelLabel(i.channel))
	}, [metrics?.items, channelLabel])

	const colorByChannel = useMemo<Record<SourceChannel, string>>(
		() => ({
			direct: '#60a5fa',
			organic: '#34d399',
			social: '#f472b6',
			referral: '#a78bfa',
			email: '#f59e0b',
			paid: '#ef4444',
		}),
		[],
	)

	const data: ChartData<'doughnut'> = useMemo(
		() => ({
			labels,
			datasets: [
				{
					label: t('total'),
					data: (metrics?.items ?? []).map(i => i.visitors),
					backgroundColor: (metrics?.items ?? []).map(i => colorByChannel[i.channel]),
					borderColor: 'rgba(255,255,255,0.08)',
					borderWidth: 1,
				},
			],
		}),
		[labels, metrics?.items, t, colorByChannel],
	)

	const options: ChartOptions<'doughnut'> = useMemo(
		() => ({
			plugins: {
				legend: {display: false},
				tooltip: {enabled: true},
			},
			cutout: '60%',
			responsive: true,
			maintainAspectRatio: false,
		}),
		[],
	)

	const updatedAtAbs = metrics?.updatedAt
		? new Date(metrics.updatedAt).toLocaleString(locale)
		: '—'

	return (
		<WidgetCard id='module-analytics-sources' title={t('title')} className='h-full'>
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
			<div className='flex flex-col gap-4 md:flex-row'>
				<div className={`flex-1 ${CHART_HEIGHT_CLASS}`}>
					<Doughnut data={data} options={options} className={CHART_CANVAS_CLASS} />
				</div>
				<div className='md:w-56'>
					<p className='text-xs text-white/70 mb-2'>{t('legend')}</p>
					<ul aria-label={t('legend')} className='space-y-1'>
						{(metrics?.items ?? []).map(item => (
							<li key={item.channel} className='flex items-center justify-between text-sm'>
								<div className='flex items-center gap-2'>
									<span
										className='inline-block h-3 w-3 rounded-sm'
										style={{backgroundColor: colorByChannel[item.channel]}}
									/>
									<span>{channelLabel(item.channel)}</span>
								</div>
								<span className='text-white/80'>
									{item.visitors} ({item.percent}%)
								</span>
							</li>
						))}
					</ul>
					<p className='mt-3 text-xs text-white/80'>
						{t('total')}: <span className='font-medium'>{metrics?.total ?? 0}</span>
					</p>
				</div>
			</div>
		</WidgetCard>
	)
}
