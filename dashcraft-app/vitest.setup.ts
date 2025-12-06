import '@testing-library/jest-dom/vitest'
import {afterEach, vi, expect} from 'vitest'
import {cleanup} from '@testing-library/react'
import {axe, toHaveNoViolations} from 'jest-axe'

// Étendre expect avec jest-axe
expect.extend(toHaveNoViolations)

// Nettoyage RTL après chaque test
afterEach(() => cleanup())

// Mocks utilitaires global
;(global as any).ResizeObserver = class {
	observe() {}
	unobserve() {}
	disconnect() {}
}

if (!(window as any).matchMedia) {
	;(window as any).matchMedia = () => ({
		matches: false,
		media: '',
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
	})
}

// Mock léger pour react-chartjs-2 (évite le besoin de canvas en JSDOM)
vi.mock('react-chartjs-2', () => {
	const React = require('react')
	return {
		Line: (props: any) => React.createElement('div', { 'data-testid': 'chart' }),
		Doughnut: (props: any) => React.createElement('div', { 'data-testid': 'doughnut-chart' }),
	}
})

// Polyfill URL.createObjectURL / revokeObjectURL pour jsdom
if (typeof URL !== 'undefined') {
	if (!(URL as any).createObjectURL) {
		;(URL as any).createObjectURL = vi.fn(() => 'blob:mock')
	}
	if (!(URL as any).revokeObjectURL) {
		;(URL as any).revokeObjectURL = vi.fn(() => {})
	}
}
