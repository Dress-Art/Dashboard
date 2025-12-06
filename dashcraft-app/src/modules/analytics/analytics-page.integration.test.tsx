/// <reference types='vitest/globals' />
/* eslint-env jest */
import {renderWithProviders, screen, within} from '@/test/test-utils'
import {AnalyticsPage} from '@/modules/analytics/AnalyticsPage'
import {axe} from 'jest-axe'
import enMessages from '@/messages/en.json'
import type {AbstractIntlMessages} from 'next-intl'

it('rend la page Analytics (FR) avec titres, région ARIA et widgets', async () => {
	const {container} = renderWithProviders(<AnalyticsPage />)

	// Section ARIA label (contenu de page)
	const section = container.querySelector(
		'section[aria-label="Contenu analytique"]',
	)
	expect(section).toBeInTheDocument()

	// Titre de page h1 et sous-titre
	const h1 = await screen.findByRole('heading', {level: 1})
	expect(h1).toHaveTextContent('Analytique')
	expect(screen.getByText('Suivez votre trafic et vos conversions')).toBeInTheDocument()

	// Widgets présents (titres h2)
	const h2Analytics = await screen.findByRole('heading', {
		level: 2,
		name: 'Trafic & Conversions',
	})
	const h2Sources = await screen.findByRole('heading', {
		level: 2,
		name: 'Répartition des sources',
	})
	const h2Kpis = await screen.findByRole('heading', {level: 2, name: 'KPIs'})
	expect(h2Analytics).toBeInTheDocument()
	expect(h2Sources).toBeInTheDocument()
	expect(h2Kpis).toBeInTheDocument()

	// KPI widget (FR)
	const kpisSection = h2Kpis.closest('section') as HTMLElement
	const kpisList = await within(kpisSection).findByRole('list', {name: 'KPIs'})
	const kpisItems = await within(kpisList).findAllByRole('listitem')
	expect(kpisItems).toHaveLength(4)
	;[
		'Inscriptions',
		'Taux de conversion',
		'Taux de rebond',
		'Durée moyenne',
	].forEach(label => {
		expect(within(kpisList).getByText(label)).toBeInTheDocument()
	})

	// Légende et total (FR)
	const sourcesSection = h2Sources.closest('section') as HTMLElement
	const legendList = await within(sourcesSection).findByRole('list', {
		name: 'Légende',
	})
	const legendItems = await within(legendList).findAllByRole('listitem')
	expect(legendItems).toHaveLength(6)
	;[
		'Direct',
		'Organique',
		'Réseaux sociaux',
		'Référent',
		'Email',
		'Payant',
	].forEach(label => {
		expect(within(legendList).getByText(label)).toBeInTheDocument()
	})

	// Format strict des items: "123 (45%)"
	legendItems.forEach(li => {
		const spans = li.querySelectorAll('span')
		const statsSpan = spans[spans.length - 1] as HTMLSpanElement
		const normalized = (statsSpan.textContent ?? '').replace(/\s+/g, ' ').trim()
		expect(normalized).toMatch(/^\d+ \(\d+%\)$/)
	})
	const sum = legendItems.reduce((acc, li) => {
		const m = (li.textContent ?? '').match(/(\d+)\s+\(\d+%/)
		return acc + (m ? Number(m[1]) : 0)
	}, 0)
	// Ne dépend pas du libellé exact: matcher fonctionnel avec normalisation
	const totalP = within(sourcesSection).getByText((_, element) => {
		if (!element || (element as HTMLElement).tagName.toLowerCase() !== 'p') return false
		const normalized = (element.textContent ?? '').replace(/\s+/g, ' ').trim()
		return /.+: \d+$/.test(normalized)
	})
	const normalizedTotal = (totalP.textContent ?? '').replace(/\s+/g, ' ').trim()
	expect(normalizedTotal).toMatch(/.+: \d+$/)
	const mTotal = normalizedTotal.match(/: (\d+)$/)
	expect(mTotal).not.toBeNull()
	expect(sum).toBe(Number(mTotal?.[1] ?? 0))

	// Ordre décroissant des visiteurs (FR)
	const visitorsFr = legendItems.map(li => {
		const m = (li.textContent ?? '').match(/(\d+)\s+\(\d+%/)
		return m ? Number(m[1]) : 0
	})
	for (let i = 0; i < visitorsFr.length - 1; i++) {
		expect(visitorsFr[i]).toBeGreaterThanOrEqual(visitorsFr[i + 1])
	}

	// Somme des pourcentages ≈ 100 (tolérance ±1)
	const percFr = legendItems.map(li => {
		const m = (li.textContent ?? '').match(/\((\d+)%\)/)
		return m ? Number(m[1]) : 0
	})
	const sumPctFr = percFr.reduce((a, b) => a + b, 0)
	expect(sumPctFr).toBeGreaterThanOrEqual(99)
	expect(sumPctFr).toBeLessThanOrEqual(101)

	// Cohérence par item: percent === round(visitors / total * 100)
	const totalNumFr = Number(mTotal?.[1] ?? 0)
	legendItems.forEach(li => {
		const txt = li.textContent ?? ''
		const mV = txt.match(/(\d+)\s+\(\d+%/)
		const mP = txt.match(/\((\d+)%\)/)
		const v = mV ? Number(mV[1]) : 0
		const p = mP ? Number(mP[1]) : 0
		const expected = totalNumFr > 0 ? Math.round((v / totalNumFr) * 100) : 0
		expect(p).toBe(expected)
	})

	// Graphiques mockés
	expect(container.querySelector('[data-testid="chart"]')).toBeInTheDocument()
	expect(container.querySelector('[data-testid="doughnut-chart"]')).toBeInTheDocument()

	// a11y
	const results = await axe(container)
	expect(results).toHaveNoViolations()
})

it('supporte i18n (EN) pour les éléments principaux de la page', async () => {
	renderWithProviders(<AnalyticsPage />, {
		locale: 'en',
		messages: enMessages as AbstractIntlMessages,
	})

	const section = await screen.findByText('Track your traffic and conversions')
	const pageSection = section.closest('section') as HTMLElement
	expect(pageSection).toHaveAttribute('aria-label', 'Analytics content')

	const h1 = await screen.findByRole('heading', {level: 1})
	expect(h1).toHaveTextContent('Analytics')

	await screen.findByRole('heading', {
		level: 2,
		name: 'Traffic & Conversions',
	})
	const h2SourcesEn = await screen.findByRole('heading', {
		level: 2,
		name: 'Sources breakdown',
	})
	// Legend and total (EN)
	const sourcesSectionEn = h2SourcesEn.closest('section') as HTMLElement
	const legendListEn = await within(sourcesSectionEn).findByRole('list', {
		name: 'Legend',
	})
	const legendItemsEn = await within(legendListEn).findAllByRole('listitem')
	expect(legendItemsEn).toHaveLength(6)
	;[
		'Direct',
		'Organic',
		'Social',
		'Referral',
		'Email',
		'Paid',
	].forEach(label => {
		expect(within(legendListEn).getByText(label)).toBeInTheDocument()
	})

	// Strict item format: "123 (45%)"
	legendItemsEn.forEach(li => {
		const spans = li.querySelectorAll('span')
		const statsSpan = spans[spans.length - 1] as HTMLSpanElement
		const normalized = (statsSpan.textContent ?? '').replace(/\s+/g, ' ').trim()
		expect(normalized).toMatch(/^\d+ \(\d+%\)$/)
	})
	const sumEn = legendItemsEn.reduce((acc, li) => {
		const m = (li.textContent ?? '').match(/(\d+)\s+\(\d+%/)
		return acc + (m ? Number(m[1]) : 0)
	}, 0)
	// Do not depend on exact label: functional matcher with normalization
	const totalPEn = within(sourcesSectionEn).getByText((_, element) => {
		if (!element || (element as HTMLElement).tagName.toLowerCase() !== 'p') return false
		const normalized = (element.textContent ?? '').replace(/\s+/g, ' ').trim()
		return /.+: \d+$/.test(normalized)
	})
	const normalizedTotalEn = (totalPEn.textContent ?? '').replace(/\s+/g, ' ').trim()
	expect(normalizedTotalEn).toMatch(/.+: \d+$/)
	const mTotalEn = normalizedTotalEn.match(/: (\d+)$/)
	expect(mTotalEn).not.toBeNull()
	expect(sumEn).toBe(Number(mTotalEn?.[1] ?? 0))

	// Desc order of visitors (EN)
	const visitorsEn = legendItemsEn.map(li => {
		const m = (li.textContent ?? '').match(/(\d+)\s+\(\d+%/)
		return m ? Number(m[1]) : 0
	})
	for (let i = 0; i < visitorsEn.length - 1; i++) {
		expect(visitorsEn[i]).toBeGreaterThanOrEqual(visitorsEn[i + 1])
	}

	// Sum of percentages ≈ 100 (±1 tolerance)
	const percEn = legendItemsEn.map(li => {
		const m = (li.textContent ?? '').match(/\((\d+)%\)/)
		return m ? Number(m[1]) : 0
	})
	const sumPctEn = percEn.reduce((a, b) => a + b, 0)
	expect(sumPctEn).toBeGreaterThanOrEqual(99)
	expect(sumPctEn).toBeLessThanOrEqual(101)

	// Per-item coherence: percent === round(visitors / total * 100)
	const totalNumEn = Number(mTotalEn?.[1] ?? 0)
	legendItemsEn.forEach(li => {
		const txt = li.textContent ?? ''
		const mV = txt.match(/(\d+)\s+\(\d+%/)
		const mP = txt.match(/\((\d+)%\)/)
		const v = mV ? Number(mV[1]) : 0
		const p = mP ? Number(mP[1]) : 0
		const expected = totalNumEn > 0 ? Math.round((v / totalNumEn) * 100) : 0
		expect(p).toBe(expected)
	})
})

it('supporte i18n (EN) pour le widget KPIs (titre + items)', async () => {
	renderWithProviders(<AnalyticsPage />, {
		locale: 'en',
		messages: enMessages as AbstractIntlMessages,
	})

	const h2KpisEn = await screen.findByRole('heading', {level: 2, name: 'KPIs'})
	const kpisSectionEn = h2KpisEn.closest('section') as HTMLElement
	const kpisListEn = await within(kpisSectionEn).findByRole('list', {name: 'KPIs'})
	const kpisItemsEn = await within(kpisListEn).findAllByRole('listitem')
	expect(kpisItemsEn).toHaveLength(4)
	;[
		'Signups',
		'Conversion rate',
		'Bounce rate',
		'Avg session',
	].forEach(label => {
		expect(within(kpisListEn).getByText(label)).toBeInTheDocument()
	})
})

it('permet de rafraîchir le widget KPIs (EN) et met à jour updatedAt', async () => {
	renderWithProviders(<AnalyticsPage />, {
		locale: 'en',
		messages: enMessages as AbstractIntlMessages,
	})

	const h2KpisEn = await screen.findByRole('heading', {level: 2, name: 'KPIs'})
	const kpisSectionEn = h2KpisEn.closest('section') as HTMLElement
	const updatedK = within(kpisSectionEn).getByText('Last update', {exact: false})
	const beforeK = updatedK.closest('p')?.textContent
	const refreshK = within(kpisSectionEn).getByRole('button', {name: 'Refresh'})

	await refreshK.click()

	await within(kpisSectionEn).findByText((content, element) => {
		return (
			element?.tagName.toLowerCase() === 'p' &&
			content.includes('Last update') &&
			content !== beforeK
		)
	})
})

it('permet de rafraîchir les deux widgets et met à jour updatedAt', async () => {
	const {container} = renderWithProviders(<AnalyticsPage />)

	// Widget Analytics
	const analyticsH2 = await screen.findByRole('heading', {
		level: 2,
		name: 'Trafic & Conversions',
	})
	const analyticsWidget = analyticsH2.closest('section') as HTMLElement
	const updatedA = within(analyticsWidget).getByText('Dernière mise à jour', {
		exact: false,
	})
	const beforeA = updatedA.closest('p')?.textContent
	const refreshA = within(analyticsWidget).getByRole('button', {
		name: 'Rafraîchir',
	})
	await refreshA.click()
	await within(analyticsWidget).findByText((content, element) => {
		return (
			element?.tagName.toLowerCase() === 'p' &&
			content.includes('Dernière mise à jour') &&
			content !== beforeA
		)
	})

	// Widget Sources
	const sourcesH2 = await screen.findByRole('heading', {
		level: 2,
		name: 'Répartition des sources',
	})
	const sourcesWidget = sourcesH2.closest('section') as HTMLElement
	const updatedS = within(sourcesWidget).getByText('Dernière mise à jour', {
		exact: false,
	})
	const beforeS = updatedS.closest('p')?.textContent
	const refreshS = within(sourcesWidget).getByRole('button', {
		name: 'Rafraîchir',
	})
	await refreshS.click()
	await within(sourcesWidget).findByText((content, element) => {
		return (
			element?.tagName.toLowerCase() === 'p' &&
			content.includes('Dernière mise à jour') &&
			content !== beforeS
		)
	})

	const results = await axe(container)
	expect(results).toHaveNoViolations()
})
