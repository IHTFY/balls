// Themes (backgrounds and glass) and ball skins sold in the shop.

/**
 * @typedef {object} Theme
 * @property {string} id
 * @property {string} name
 * @property {number} price
 * @property {'bubbles' | 'stars' | 'embers' | 'snow' | 'grid' | 'petals' | 'none'} ambience
 * @property {boolean} [light]
 * @property {string} chrome browser toolbar color
 * @property {Record<string, string>} vars CSS custom properties
 */

/** @type {Theme[]} */
export const THEMES = [
	{
		id: 'midnight',
		name: 'Midnight',
		price: 0,
		ambience: 'bubbles',
		chrome: '#141537',
		vars: {
			'--panel': '#1e1f4f',
			'--bg': 'radial-gradient(120% 80% at 50% 0%, #2b2f77 0%, #141537 55%, #0a0a1f 100%)',
			'--surface': 'rgb(255 255 255 / 0.07)',
			'--surface-strong': 'rgb(255 255 255 / 0.12)',
			'--text': '#f4f3ff',
			'--muted': '#a9a8d6',
			'--accent': '#ffcf3f',
			'--accent-2': '#7c5cff',
			'--glass': 'rgb(170 190 255 / 0.10)',
			'--glass-edge': 'rgb(190 205 255 / 0.45)',
			'--particle': '#8fa2ff'
		}
	},
	{
		id: 'ocean',
		name: 'Deep Ocean',
		price: 300,
		ambience: 'bubbles',
		chrome: '#064266',
		vars: {
			'--panel': '#0b3554',
			'--bg': 'linear-gradient(180deg, #0b6fa4 0%, #064266 45%, #021a2e 100%)',
			'--surface': 'rgb(255 255 255 / 0.08)',
			'--surface-strong': 'rgb(255 255 255 / 0.14)',
			'--text': '#eafcff',
			'--muted': '#9fd3e6',
			'--accent': '#3ff3d0',
			'--accent-2': '#00a6ff',
			'--glass': 'rgb(160 240 255 / 0.10)',
			'--glass-edge': 'rgb(170 245 255 / 0.5)',
			'--particle': '#bff6ff'
		}
	},
	{
		id: 'sunset',
		name: 'Sunset Strip',
		price: 400,
		ambience: 'petals',
		chrome: '#c2366b',
		vars: {
			'--panel': '#57204f',
			'--bg': 'linear-gradient(180deg, #ff7a59 0%, #c2366b 45%, #3b1450 100%)',
			'--surface': 'rgb(255 255 255 / 0.12)',
			'--surface-strong': 'rgb(255 255 255 / 0.2)',
			'--text': '#fff6ef',
			'--muted': '#ffd0c2',
			'--accent': '#ffe066',
			'--accent-2': '#ff4f8b',
			'--glass': 'rgb(255 230 220 / 0.14)',
			'--glass-edge': 'rgb(255 236 228 / 0.6)',
			'--particle': '#ffd6a5'
		}
	},
	{
		id: 'forest',
		name: 'Enchanted Forest',
		price: 400,
		ambience: 'embers',
		chrome: '#12402a',
		vars: {
			'--panel': '#173d2b',
			'--bg': 'radial-gradient(120% 90% at 50% 10%, #2f7a4f 0%, #12402a 50%, #071a11 100%)',
			'--surface': 'rgb(255 255 255 / 0.08)',
			'--surface-strong': 'rgb(255 255 255 / 0.14)',
			'--text': '#f0fff4',
			'--muted': '#a8d8b9',
			'--accent': '#d4ff5c',
			'--accent-2': '#3ddc84',
			'--glass': 'rgb(200 255 220 / 0.10)',
			'--glass-edge': 'rgb(210 255 225 / 0.45)',
			'--particle': '#f6ff9e'
		}
	},
	{
		id: 'candy',
		name: 'Candy Land',
		price: 500,
		ambience: 'petals',
		light: true,
		chrome: '#e0c3fc',
		vars: {
			'--panel': '#fff5fb',
			'--bg': 'linear-gradient(160deg, #ffd1ec 0%, #e0c3fc 50%, #b5e8ff 100%)',
			'--surface': 'rgb(255 255 255 / 0.55)',
			'--surface-strong': 'rgb(255 255 255 / 0.8)',
			'--text': '#4a2350',
			'--muted': '#8a5f91',
			'--accent': '#ff4fa3',
			'--accent-2': '#8f5bff',
			'--glass': 'rgb(255 255 255 / 0.35)',
			'--glass-edge': 'rgb(140 80 160 / 0.45)',
			'--particle': '#ffffff'
		}
	},
	{
		id: 'arctic',
		name: 'Arctic Dawn',
		price: 600,
		ambience: 'snow',
		light: true,
		chrome: '#c4ddf6',
		vars: {
			'--panel': '#f5f9ff',
			'--bg': 'linear-gradient(180deg, #e8f4ff 0%, #c4ddf6 55%, #9cc0e6 100%)',
			'--surface': 'rgb(255 255 255 / 0.6)',
			'--surface-strong': 'rgb(255 255 255 / 0.85)',
			'--text': '#17324d',
			'--muted': '#4f6f8f',
			'--accent': '#ff6b3d',
			'--accent-2': '#2e7bff',
			'--glass': 'rgb(255 255 255 / 0.4)',
			'--glass-edge': 'rgb(40 80 130 / 0.4)',
			'--particle': '#ffffff'
		}
	},
	{
		id: 'cosmos',
		name: 'Cosmos',
		price: 700,
		ambience: 'stars',
		chrome: '#10081f',
		vars: {
			'--panel': '#1e1338',
			'--bg': 'radial-gradient(90% 60% at 70% 20%, #3a1c71 0%, #10081f 55%, #000 100%)',
			'--surface': 'rgb(255 255 255 / 0.07)',
			'--surface-strong': 'rgb(255 255 255 / 0.13)',
			'--text': '#f5f0ff',
			'--muted': '#b6a6d9',
			'--accent': '#ff9df0',
			'--accent-2': '#6be3ff',
			'--glass': 'rgb(220 200 255 / 0.09)',
			'--glass-edge': 'rgb(225 210 255 / 0.4)',
			'--particle': '#ffffff'
		}
	},
	{
		id: 'lava',
		name: 'Lava Core',
		price: 800,
		ambience: 'embers',
		chrome: '#8a1200',
		vars: {
			'--panel': '#3b0f07',
			'--bg': 'radial-gradient(120% 70% at 50% 100%, #ff5a1f 0%, #8a1200 35%, #1a0300 80%)',
			'--surface': 'rgb(255 255 255 / 0.08)',
			'--surface-strong': 'rgb(255 255 255 / 0.14)',
			'--text': '#fff3e8',
			'--muted': '#ffb08a',
			'--accent': '#ffd23f',
			'--accent-2': '#ff5a1f',
			'--glass': 'rgb(255 200 160 / 0.10)',
			'--glass-edge': 'rgb(255 210 170 / 0.45)',
			'--particle': '#ffb347'
		}
	},
	{
		id: 'arcade',
		name: 'Neon Arcade',
		price: 900,
		ambience: 'grid',
		chrome: '#261447',
		vars: {
			'--panel': '#21103f',
			'--bg': 'linear-gradient(180deg, #0d0221 0%, #261447 60%, #2e0f4f 100%)',
			'--surface': 'rgb(255 255 255 / 0.06)',
			'--surface-strong': 'rgb(255 255 255 / 0.12)',
			'--text': '#fdf0ff',
			'--muted': '#c79bff',
			'--accent': '#00f0ff',
			'--accent-2': '#ff2a6d',
			'--glass': 'rgb(0 240 255 / 0.07)',
			'--glass-edge': 'rgb(0 240 255 / 0.6)',
			'--particle': '#ff2a6d'
		}
	},
	{
		id: 'paper',
		name: 'Paper Craft',
		price: 300,
		ambience: 'none',
		light: true,
		chrome: '#f1e7d6',
		vars: {
			'--panel': '#fffaf0',
			'--bg': 'linear-gradient(180deg, #fbf6ec 0%, #f1e7d6 100%)',
			'--surface': 'rgb(80 60 30 / 0.06)',
			'--surface-strong': 'rgb(80 60 30 / 0.11)',
			'--text': '#3b2f20',
			'--muted': '#7a6a55',
			'--accent': '#e4572e',
			'--accent-2': '#2f6690',
			'--glass': 'rgb(255 255 255 / 0.5)',
			'--glass-edge': 'rgb(60 45 25 / 0.45)',
			'--particle': '#d8c8a8'
		}
	}
];

/** Ball colors in the order levels introduce them; most distinct first. */
export const PALETTE = [
	'#ff3b47', // red
	'#2f7bff', // blue
	'#ffd51f', // yellow
	'#1fcf5a', // green
	'#a64dff', // purple
	'#ff8a1f', // orange
	'#3fd8ff', // sky
	'#ff5fc8', // pink
	'#a3e635', // lime
	'#14b8a6', // teal
	'#f5f5f5', // white
	'#8b5a2b', // brown
	'#4338ca', // indigo
	'#6b7280' // gray
];

const PASTEL = [
	'#ff9aa2',
	'#9ec5ff',
	'#ffe79a',
	'#a8e6a1',
	'#cfa8ff',
	'#ffc29a',
	'#a0ecff',
	'#ffb3e6',
	'#d9f99d',
	'#99e6d8',
	'#ffffff',
	'#d4a373',
	'#a5a6f6',
	'#c4c4cc'
];

/** Shapes drawn on balls in color-assist mode, one per color. */
export const SYMBOLS = ['●', '▲', '■', '◆', '★', '✚', '♥', '♠', '♣', '☾', '✿', '⬟', '✖', '☀'];

/**
 * @typedef {object} Skin
 * @property {string} id
 * @property {string} name
 * @property {number} price
 * @property {'glossy' | 'matte' | 'neon' | 'gem' | 'billiard' | 'emoji' | 'marble'} style
 * @property {string[]} colors
 * @property {string[]} [emoji]
 */

/** @type {Skin[]} */
export const SKINS = [
	{ id: 'glossy', name: 'Glossy', price: 0, style: 'glossy', colors: PALETTE },
	{ id: 'billiard', name: 'Billiards', price: 250, style: 'billiard', colors: PALETTE },
	{ id: 'pastel', name: 'Pastel Dream', price: 300, style: 'matte', colors: PASTEL },
	{ id: 'neon', name: 'Neon Glow', price: 400, style: 'neon', colors: PALETTE },
	{
		id: 'fruit',
		name: 'Fruit Salad',
		price: 500,
		style: 'emoji',
		colors: PALETTE,
		emoji: ['🍓', '🫐', '🍋', '🥝', '🍇', '🍊', '💧', '🌸', '🍐', '🥥', '🥚', '🌰', '🍆', '🍄']
	},
	{
		id: 'sports',
		name: 'Sports Day',
		price: 600,
		style: 'emoji',
		colors: PALETTE,
		emoji: ['🏀', '⚽', '🎾', '🥎', '🏐', '🏈', '⚾', '🎱', '🏉', '🥏', '🏓', '🎳', '🪀', '🏸']
	},
	{ id: 'marble', name: 'Marbles', price: 700, style: 'marble', colors: PALETTE },
	{ id: 'gem', name: 'Gemstones', price: 800, style: 'gem', colors: PALETTE },
	{
		id: 'critters',
		name: 'Critters',
		price: 900,
		style: 'emoji',
		colors: PALETTE,
		emoji: ['🦊', '🐳', '🐥', '🐸', '🦄', '🐯', '🐬', '🐷', '🐢', '🦜', '🐼', '🐻', '🐙', '🐨']
	}
];

/** @param {string} id */
export const themeById = (id) => THEMES.find((t) => t.id === id) ?? THEMES[0];

/** @param {string} id */
export const skinById = (id) => SKINS.find((s) => s.id === id) ?? SKINS[0];

/** Boosters sold in bundles. */
const HINT = {
	id: /** @type {const} */ ('hints'),
	icon: '💡',
	description: 'Shows your next best move'
};
const TUBE = {
	id: /** @type {const} */ ('tubes'),
	icon: '🧪',
	description: 'An empty tube when you’re stuck'
};
export const BOOSTERS = [
	{ ...HINT, name: 'Hints ×3', count: 3, price: 60 },
	{ ...HINT, name: 'Hints ×10', count: 10, price: 180 },
	{ ...TUBE, name: 'Extra tube ×1', count: 1, price: 90 },
	{ ...TUBE, name: 'Extra tubes ×5', count: 5, price: 400 }
];
