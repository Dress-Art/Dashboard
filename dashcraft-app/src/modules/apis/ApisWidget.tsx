'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations} from 'next-intl'
import {useEffect, useRef, useState} from 'react'
import {Icon} from '@/lib/icons'
import {type ApiEntity, useApi} from '@/lib/useApi'

interface ApiService {
	id: string
	name: string
	ok: boolean
}

/**
 * ApisWidget
 * Affiche l’état de quelques services externes via `useApi.apis.list`
 * (données réelles) avec i18n, a11y et HeroIcons.
 */
export function ApisWidget() {
	const t = useTranslations('widgets.apis')
	const tPage = useTranslations('pages.apis')
	const api = useApi()
	const [items, setItems] = useState<ApiEntity[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Stabilise la référence à la fonction list pour éviter les re-renders infinis
	// si l'implémentation de useApi recrée les objets à chaque rendu (ex: mocks)
	const listRef = useRef(api.apis.list)

	useEffect(() => {
		let active = true

		// Modes debug: via localStorage ou querystring (?apisDebug=...)
		let debug: string | null = null
		try {
			debug =
				(typeof window !== 'undefined' &&
					(window.localStorage.getItem('dashcraft.apisWidget.debug') ||
						new URLSearchParams(window.location.search).get('apisDebug'))) ||
				null
		} catch {
			// ignore
		}

		setError(null)
		setItems([])

		if (debug === 'loading') {
			setLoading(true)
			return () => {
				active = false
			}
		}

		if (debug === 'error') {
			setLoading(false)
			setError('debug')
			return () => {
				active = false
			}
		}

		if (debug === 'empty') {
			setLoading(false)
			// items déjà vide
			return () => {
				active = false
			}
		}

		setLoading(true)
		void listRef.current({
			page: 1,
			pageSize: 4,
			status: 'all',
			sortBy: 'lastChecked',
			sortDir: 'desc',
		})
			.then(res => {
				if (!active) return
				setItems(res.items)
			})
			.catch(e => {
				if (!active) return
				setError((e as Error).message)
			})
			.finally(() => {
				if (!active) return
				setLoading(false)
			})

		return () => {
			active = false
		}
	}, [listRef])

	const services: ApiService[] = items.map(row => ({
		id: row.id,
		name: row.name,
		ok: row.status === 'up',
	}))

	return (
		<WidgetCard id='module-apis' title={t('title')}>
			<table
				className='min-w-full text-sm'
				aria-label={t('title')}
				aria-busy={loading}
			>
				<thead className='text-left text-white/70'>
					<tr>
						<th scope='col' className='pb-2 pr-4'>{t('service')}</th>
						<th
							scope='col'
							className='pb-2'
							aria-label={tPage('fields.status')}
						>
							{' '}
						</th>
					</tr>
				</thead>
				<tbody className='divide-y divide-white/10'>
					{services.map(s => (
						<tr key={s.id}>
							<td className='py-2 pr-4'>{s.name}</td>
							<td className='py-2'>
								<span className='inline-flex items-center gap-1'>
									<Icon
										name={s.ok ? 'check-circle' : 'x-circle'}
										className={
											s.ok ? 'h-4 w-4 text-green-400' : 'h-4 w-4 text-amber-400'
										}
									/>
									<span>
										{s.ok ? t('statusOk') : t('statusDown')}
									</span>
								</span>
							</td>
						</tr>
					))}
					{(loading || error || services.length === 0) && (
						<tr>
							<td
								className='py-3 text-white/70'
								colSpan={2}
								role='status'
								aria-live='polite'
							>
								{loading
									? tPage('loading')
									: error
									? tPage('error')
									: tPage('noResults')}
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</WidgetCard>
	)
}

