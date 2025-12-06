'use client'

import {useTranslations} from 'next-intl'
import {useCallback, useState} from 'react'
import {ApisTable} from './components/apis-table'
import {ApiKeysPanel} from './components/api-keys-panel'
import {type ApiEntity} from '@/lib/useApi'

/**
 * ApisPage
 * Page APIs externes affichant le widget de statut de services.
 * - i18n: titres via 'nav.apis' et 'pages.apis.subtitle'
 * - A11y: section avec aria-label via 'pages.apis.regionLabel'
 */
export function ApisPage() {
	const tNav = useTranslations('nav')
	const t = useTranslations('pages.apis')

	// État panneau des clés API
	const [keysOpen, setKeysOpen] = useState(false)
	const [selectedApiId, setSelectedApiId] = useState<string | null>(null)
	const [selectedApiName, setSelectedApiName] = useState<string | undefined>(
		undefined,
	)

	const handleOpenKeys = useCallback(
		(api: ApiEntity) => {
			setSelectedApiId(api.id)
			setSelectedApiName(api.name)
			setKeysOpen(true)
		},
		[],
	)

	const handleCloseKeys = useCallback(() => {
		setKeysOpen(false)
		setSelectedApiId(null)
		setSelectedApiName(undefined)
	}, [])

	return (
		<section aria-label={t('regionLabel')}>
			<header className='mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
				<div>
					<h1 id='apis-title' className='text-xl font-semibold'>
						{tNav('apis')}
					</h1>
					<p className='text-sm text-white/70 mt-1'>
						{t('subtitle')}
					</p>
				</div>
			</header>

			<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
				<div className='md:col-span-2'>
					<ApisTable onOpenKeys={handleOpenKeys} />
				</div>
			</div>

			<ApiKeysPanel
				open={keysOpen}
				apiId={selectedApiId}
				apiName={selectedApiName}
				onClose={handleCloseKeys}
			/>
		</section>
	)
}

