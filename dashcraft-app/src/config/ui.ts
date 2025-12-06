/**
 * UI config centralisée
 * - CHART_HEIGHT_PX: hauteur cible des graphiques en px
 * - CHART_HEIGHT_CLASS: classe Tailwind correspondante
 * - CHART_CANVAS_CLASS: force le canvas Chart.js à remplir son conteneur
 */
export const CHART_HEIGHT_PX = 420

export const CHART_HEIGHT_CLASS = `h-[${CHART_HEIGHT_PX}px]`

// Note: les classes avec '!' ajoutent !important pour outrepasser le style inline de Chart.js
export const CHART_CANVAS_CLASS = '!h-full !w-full'
