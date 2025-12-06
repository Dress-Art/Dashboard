'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations, useLocale} from 'next-intl'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {useCallback, useEffect, useRef, useState} from 'react'
import {useApi} from '@/lib/useApi'
import type {InternalApiMetrics, InternalApiLog} from '@/lib/useApi'
import {Icon} from '@/lib/icons'

/**
 * InternalApisWidget
 * Widget de monitoring des APIs internes.
 * - Affiche les métriques: taux de succès, taux d'erreur, temps moyen, requêtes 24h
 * - Affiche un tableau de logs récents (heure, méthode, route, statut, durée, utilisateur)
 * - Bouton de rafraîchissement pour simuler l'évolution des métriques et l'arrivée de nouveaux logs
 */
export function InternalApisWidget() {
	const t = useTranslations('widgets.internalApis')
	const locale = useLocale()
	const api = useApi()
	const apiRef = useRef(api)
	const [metrics, setMetrics] = useState<InternalApiMetrics | null>(null)
	const [logs, setLogs] = useState<InternalApiLog[]>([])
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(8)
	const [statusClass, setStatusClass] = useState<'all' | '2xx' | '4xx' | '5xx'>('all')
	const [method, setMethod] = useState<'ALL' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('ALL')
	const [totalPages, setTotalPages] = useState(1)
	const [loading, setLoading] = useState(false)
	const [, setTick] = useState(0)

	dayjs.extend(relativeTime)
	const effectiveLocale = locale.toLowerCase().split('-')[0] === 'fr'
		? 'fr'
		: 'en'

	useEffect(() => {
		apiRef.current = api
	}, [api])

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
		async function loadMetrics() {
			try {
				const m = await apiRef.current.internalApis.getMetrics()
				if (mounted) setMetrics(m)
			} catch {}
		}
		loadMetrics()
		return () => {
			mounted = false
		}
	}, [])

	useEffect(() => {
		let active = true
		async function loadLogs() {
			setLoading(true)
			try {
				const res = await apiRef.current.internalApis.listLogs({
					page,
					pageSize,
					statusClass,
					method,
				})
				if (!active) return
				setLogs(res.items)
				setTotalPages(res.totalPages)
			} catch {
				if (!active) return
				setLogs([])
				setTotalPages(1)
			} finally {
				if (active) setLoading(false)
			}
		}
		loadLogs()
		return () => {
			active = false
		}
	}, [page, pageSize, statusClass, method])

	const success = metrics?.successRatePct ?? 0
	const error = metrics?.errorRatePct ?? 0
	const avg = metrics?.avgResponseMs ?? 0
	const req24h = metrics?.requestsLast24h ?? 0
	const updatedAtAbs = metrics?.updatedAt
		? new Date(metrics.updatedAt).toLocaleString(locale)
		: '—'
	const updatedAtRel = metrics?.updatedAt
		? dayjs(metrics.updatedAt).locale(effectiveLocale).fromNow()
		: null

	const handleRefresh = useCallback(async () => {
		try {
			const next = await apiRef.current.internalApis.refreshMetrics()
			setMetrics(next)
			const res = await apiRef.current.internalApis.listLogs({
				page,
				pageSize,
				statusClass,
				method,
			})
			setLogs(res.items)
			setTotalPages(res.totalPages)
		} catch {
			// silencieux pour mock
		}
	}, [page, pageSize, statusClass, method])

	return (
		<WidgetCard id='module-internal-apis' title={t('title')}>
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

			<div className='mb-6 grid grid-cols-2 gap-4 md:grid-cols-4'>
				<div className='rounded-md bg-white/5 p-4'>
					<p className='text-xs text-white/70'>{t('successRate')}</p>
					<p className='text-lg font-semibold'>{success} %</p>
				</div>
				<div className='rounded-md bg-white/5 p-4'>
					<p className='text-xs text-white/70'>{t('errorRate')}</p>
					<p className='text-lg font-semibold'>{error} %</p>
				</div>
				<div className='rounded-md bg-white/5 p-4'>
					<p className='text-xs text-white/70'>{t('avgResponse')}</p>
					<p className='text-lg font-semibold'>{avg} {t('unitMs')}</p>
				</div>
				<div className='rounded-md bg-white/5 p-4'>
					<p className='text-xs text-white/70'>{t('requestsLast24h')}</p>
					<p className='text-lg font-semibold'>{req24h}</p>
				</div>
			</div>

			<div className='rounded-md bg-white/5 p-4'>
				<div className='mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
					<p className='text-sm font-medium'>{t('logs')}</p>
					<div className='flex flex-wrap items-end gap-3'>
						<div className='flex flex-col'>
							<label htmlFor='method-filter' className='text-xs text-white/70'>
								{t('filter.method.label')}
							</label>
							<select
								id='method-filter'
								aria-label={t('filter.method.label')}
								className='rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs'
								value={method}
								onChange={e => {
									setMethod(e.target.value as typeof method)
									setPage(1)
								}}
							>
								<option value='ALL'>{t('filter.method.ALL')}</option>
								<option value='GET'>{t('filter.method.GET')}</option>
								<option value='POST'>{t('filter.method.POST')}</option>
								<option value='PUT'>{t('filter.method.PUT')}</option>
								<option value='PATCH'>{t('filter.method.PATCH')}</option>
								<option value='DELETE'>{t('filter.method.DELETE')}</option>
							</select>
						</div>
						<div className='flex flex-col'>
							<label htmlFor='status-filter' className='text-xs text-white/70'>
								{t('filter.status.label')}
							</label>
							<select
								id='status-filter'
								aria-label={t('filter.status.label')}
								className='rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs'
								value={statusClass}
								onChange={e => {
									setStatusClass(e.target.value as typeof statusClass)
									setPage(1)
								}}
							>
								<option value='all'>{t('filter.status.all')}</option>
								<option value='2xx'>{t('filter.status.2xx')}</option>
								<option value='4xx'>{t('filter.status.4xx')}</option>
								<option value='5xx'>{t('filter.status.5xx')}</option>
							</select>
						</div>
						<div className='flex items-end gap-2'>
							<button
								type='button'
								className='rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs hover:opacity-80 disabled:opacity-50'
								onClick={() => setPage(p => Math.max(1, p - 1))}
								disabled={page <= 1 || loading}
								aria-label={t('previous')}
							>
								{t('previous')}
							</button>
							<p className='text-xs text-white/70'>
								{t('page')} {page} {t('of')} {totalPages}
							</p>
							<button
								type='button'
								className='rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs hover:opacity-80 disabled:opacity-50'
								onClick={() => setPage(p => Math.min(totalPages, p + 1))}
								disabled={page >= totalPages || loading}
								aria-label={t('next')}
							>
								{t('next')}
							</button>
							<div className='ml-2 flex items-center gap-2'>
								<label htmlFor='page-size' className='text-xs text-white/70'>
									{t('pageSize')}
								</label>
								<select
									id='page-size'
									aria-label={t('pageSize')}
									className='rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs'
									value={pageSize}
									onChange={e => {
										const v = Number(e.target.value)
										setPageSize(Number.isNaN(v) ? 8 : v)
										setPage(1)
									}}
								>
									<option value={5}>5</option>
									<option value={8}>8</option>
									<option value={10}>10</option>
									<option value={20}>20</option>
								</select>
							</div>
						</div>
					</div>
				</div>
				<div className='overflow-x-auto'>
					<table className='min-w-full text-left text-xs' aria-label={t('logs')}>
						<thead className='text-white/60'>
							<tr>
								<th className='px-2 py-1'>{t('columns.time')}</th>
								<th className='px-2 py-1'>{t('columns.method')}</th>
								<th className='px-2 py-1'>{t('columns.route')}</th>
								<th className='px-2 py-1'>{t('columns.status')}</th>
								<th className='px-2 py-1'>{t('columns.duration')}</th>
								<th className='px-2 py-1'>{t('columns.user')}</th>
							</tr>
						</thead>
						<tbody>
							{logs.length === 0 ? (
								<tr className='border-t border-white/10'>
									<td
										className='px-2 py-4 text-center text-white/60'
										colSpan={6}
										role='status'
										aria-live='polite'
									>
										{t('noLogs')}
									</td>
								</tr>
							) : (
								logs.map(l => (
									<tr key={l.id} className='border-t border-white/10'>
										<td className='px-2 py-1'>
											{new Date(l.time).toLocaleString(locale)}
										</td>
										<td className='px-2 py-1'>{l.method}</td>
										<td className='px-2 py-1'>{l.route}</td>
										<td className='px-2 py-1'>{l.status}</td>
										<td className='px-2 py-1'>{l.durationMs} {t('unitMs')}</td>
										<td className='px-2 py-1'>{l.user}</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</WidgetCard>
	)
}
