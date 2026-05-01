import {NextIntlClientProvider, type AbstractIntlMessages} from 'next-intl'
import {AppProviders} from '@/components/providers/AppProviders'
import messagesFr from '@/messages/fr.json'
import {render as rtlRender} from '@testing-library/react'
import type {ReactElement, ReactNode} from 'react'

interface RenderOptions {
	locale?: 'fr' | 'en'
	messages?: AbstractIntlMessages
}

function Providers({children, locale = 'fr', messages = messagesFr as AbstractIntlMessages}: {children: ReactNode; locale?: 'fr' | 'en'; messages?: AbstractIntlMessages}) {
	return (
		<NextIntlClientProvider locale={locale} messages={messages}>
			<AppProviders>{children}</AppProviders>
		</NextIntlClientProvider>
	)
}

export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
	const {locale, messages} = options
	return rtlRender(ui, {
		wrapper: ({children}) => (
			<Providers locale={locale} messages={messages}>{children}</Providers>
		),
	})
}

export * from '@testing-library/react'
