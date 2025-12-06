#!/usr/bin/env node

/*
	Audit i18n EN ↔ FR sur pages.* et widgets.*
	- Détecte: clés manquantes, orphelines, incohérences de structure
	- Option --fix: ajoute les clés manquantes avec placeholders
	Style: tabs, single quotes, pas de point-virgule
*/

const fs = require('fs')
const path = require('node:path')

const ROOT = process.cwd()
const EN_PATH = path.join(ROOT, 'src/messages/en.json')
const FR_PATH = path.join(ROOT, 'src/messages/fr.json')
const SRC_DIR = path.join(ROOT, 'src')
const NAMESPACES = ['pages', 'widgets']

const args = process.argv.slice(2)
const FIX = args.includes('--fix')

function readJson (p) {
	const raw = fs.readFileSync(p, 'utf8')
	return JSON.parse(raw)
}

function writeJson (p, obj) {
	const json = JSON.stringify(obj, null, '\t') + '\n'
	fs.writeFileSync(p, json, 'utf8')
}

function isPlainObject (v) {
	return v && typeof v === 'object' && !Array.isArray(v)
}

function flatten (obj, base = '') {
	const out = {}
	for (const k of Object.keys(obj || {})) {
		const key = base ? base + '.' + k : k
		const v = obj[k]
		if (isPlainObject(v)) {
			Object.assign(out, flatten(v, key))
		} else if (Array.isArray(v)) {
			out[key] = 'array'
		} else {
			out[key] = typeof v
		}
	}
	return out
}

function pickNamespaces (root) {
	const picked = {}
	for (const ns of NAMESPACES) {
		if (root && Object.prototype.hasOwnProperty.call(root, ns)) {
			picked[ns] = root[ns]
		}
	}
	return picked
}

function deepSet (obj, key, value) {
	const parts = key.split('.')
	let cur = obj
	for (let i = 0; i < parts.length; i++) {
		const p = parts[i]
		const isLast = i === parts.length - 1
		if (!isLast) {
			if (!isPlainObject(cur[p])) cur[p] = {}
			cur = cur[p]
		} else {
			cur[p] = value
		}
	}
}

function materializeFromTemplate (tpl, locale) {
	if (typeof tpl === 'string') {
		return locale === 'fr' ? tpl + ' [À traduire]' : 'TODO'
	}
	if (Array.isArray(tpl)) return []
	if (isPlainObject(tpl)) {
		const o = {}
		for (const k of Object.keys(tpl)) {
			o[k] = materializeFromTemplate(tpl[k], locale)
		}
		return o
	}
	return tpl
}

function collectUsedKeys () {
	const used = new Set()
	const exts = new Set(['.ts', '.tsx'])
	function walk (dir) {
		for (const name of fs.readdirSync(dir)) {
			const p = path.join(dir, name)
			const st = fs.statSync(p)
			if (st.isDirectory()) {
				if (name === 'node_modules' || name === '.next' || name === '__mocks__') continue
				walk(p)
			} else {
				if (!exts.has(path.extname(name))) continue
				const s = fs.readFileSync(p, 'utf8')
				const re = /\bt\(\s*(["'`])((?:pages|widgets)\.[^"'`]+)\1\s*\)/g
				let m
				while ((m = re.exec(s)) !== null) used.add(m[2])
			}
		}
	}
	walk(SRC_DIR)
	return used
}

function diffMaps (a, b) {
	const onlyInA = []
	const onlyInB = []
	const typeMismatches = []
	const keys = new Set([...Object.keys(a), ...Object.keys(b)])
	for (const k of keys) {
		if (!(k in a)) onlyInB.push(k)
		else if (!(k in b)) onlyInA.push(k)
		else if (a[k] !== b[k]) typeMismatches.push({key: k, en: a[k], fr: b[k]})
	}
	return {onlyInA, onlyInB, typeMismatches}
}

function main () {
	const enRoot = readJson(EN_PATH)
	const frRoot = readJson(FR_PATH)
	const en = pickNamespaces(enRoot)
	const fr = pickNamespaces(frRoot)

	const flatEN = flatten(en)
	const flatFR = flatten(fr)
	const {onlyInA: missingInFR, onlyInB: missingInEN, typeMismatches} = diffMaps(flatEN, flatFR)

	const used = collectUsedKeys()
	const presentEN = new Set(Object.keys(flatEN))
	const presentFR = new Set(Object.keys(flatFR))
	const usedNotInEN = [...used].filter(k => !presentEN.has(k))
	const usedNotInFR = [...used].filter(k => !presentFR.has(k))

	const report = {
		missingInFR,
		missingInEN,
		typeMismatches,
		usedNotInEN,
		usedNotInFR,
		stats: {
			enKeys: Object.keys(flatEN).length,
			frKeys: Object.keys(flatFR).length,
			usedKeys: used.size
		}
	}

	if (FIX) {
		// Appliquer corrections minimales (ajout des clés manquantes)
		for (const k of missingInFR) {
			// Construire à partir du template EN
			const value = k.split('.').reduce((acc, part) => acc && acc[part], en)
			deepSet(fr, k, materializeFromTemplate(value, 'fr'))
		}
		for (const k of missingInEN) {
			const value = k.split('.').reduce((acc, part) => acc && acc[part], fr)
			deepSet(en, k, materializeFromTemplate(value, 'en'))
		}
		writeJson(EN_PATH, {...enRoot, ...en})
		writeJson(FR_PATH, {...frRoot, ...fr})
	}

	console.log('[i18n-audit] Résultats:')
	console.log(JSON.stringify(report, null, '\t'))
}

try {
	main()
} catch (e) {
	console.error('[i18n-audit] ERREUR:', e.message)
	process.exitCode = 1
}
