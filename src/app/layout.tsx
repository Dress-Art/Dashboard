import type {Metadata} from 'next'
import './globals.css'
import {Inter} from 'next/font/google'
import {NextIntlClientProvider} from 'next-intl'
import {getLocale, getMessages} from 'next-intl/server'
import {AppProviders} from '@/components/providers/AppProviders'

const inter = Inter({subsets: ['latin']})

export const metadata: Metadata = {
	title: 'DashCraft',
	description: 'Dashboard personnalisable',
}

/**
 * RootLayout
 * Fournit le provider NextIntl et lit la locale depuis le cookie.
 * Les polices Google sont désactivées pour assurer un build hors-ligne.
 */
export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const locale = await getLocale()
	const messages = await getMessages()

	return (
		<html lang={locale}>
			<body className={`${inter.className}`}>
				<NextIntlClientProvider locale={locale} messages={messages}>
					<AppProviders>
						{children}
					</AppProviders>
				</NextIntlClientProvider>
			</body>
		</html>
	)
}
