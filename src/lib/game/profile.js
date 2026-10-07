// The saved player profile, and recovery from missing or damaged saves.
import { SKINS, THEMES } from './cosmetics.js';

export const STORAGE_KEY = 'balls.profile.v1';

const SETTINGS = {
	sound: true,
	music: true,
	haptics: true,
	symbols: false,
	stacks: false,
	targets: true,
	autoMove: false,
	autoFinish: false,
	deadEnd: true,
	reducedMotion: false
};

const STATS = {
	solved: 0,
	moves: 0,
	undos: 0,
	hintsUsed: 0,
	tubesAdded: 0,
	tubesCompleted: 0,
	perfect: 0,
	flawless: 0,
	underPar: 0,
	bestCombo: 0,
	seconds: 0,
	fastest: 0,
	zenSolved: 0,
	blitzRuns: 0,
	blitzBest: 0,
	blitzMostSolved: 0,
	dailySolved: 0,
	mysterySolved: 0,
	bossesBeaten: 0,
	coinsEarned: 0,
	purchases: 0
};

export const defaultProfile = () => ({
	coins: 100,
	/** Highest level the player may start. */
	unlocked: 1,
	/** @type {Record<string, number>} level → best stars */
	stars: {},
	/** @type {Record<string, number>} level → fewest moves */
	best: {},
	/** Lifetime points, which set the player's rank. */
	score: 0,
	hints: 3,
	tubes: 1,
	owned: ['midnight', 'glossy'],
	theme: 'midnight',
	skin: 'glossy',
	settings: { ...SETTINGS },
	stats: { ...STATS },
	/** @type {Record<string, string>} achievement id → date unlocked */
	achievements: {},
	daily: {
		/** @type {Record<string, { moves: number, stars: number, seconds: number }>} */
		done: {},
		streak: 0,
		best: 0,
		/** @type {string | null} */
		last: null
	},
	gift: {
		/** @type {string | null} */
		last: null,
		streak: 0
	},
	tutorialDone: false,
	/** @type {unknown} an unfinished game, checked again when resumed */
	saved: null
});

/** @typedef {ReturnType<typeof defaultProfile>} Profile */

const isRecord = (/** @type {unknown} */ v) =>
	typeof v === 'object' && v !== null && !Array.isArray(v);
const count = (/** @type {unknown} */ v, /** @type {number} */ fallback) =>
	typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const KNOWN = new Set([...THEMES.map((t) => t.id), ...SKINS.map((s) => s.id)]);

/**
 * @template {Record<string, any>} T
 * @param {T} defaults
 * @param {unknown} raw
 * @param {(value: unknown, fallback: any) => any} check
 * @returns {T}
 */
function fields(defaults, raw, check) {
	const source = isRecord(raw) ? /** @type {Record<string, unknown>} */ (raw) : {};
	/** @type {Record<string, any>} */
	const out = {};
	for (const [key, fallback] of Object.entries(defaults)) out[key] = check(source[key], fallback);
	return /** @type {T} */ (out);
}

/**
 * Keys that are positive level numbers, with values passing `check`.
 * @param {unknown} raw
 * @param {(value: number) => boolean} check
 */
function levelRecord(raw, check) {
	/** @type {Record<string, number>} */
	const out = {};
	if (!isRecord(raw)) return out;
	for (const [key, value] of Object.entries(/** @type {Record<string, unknown>} */ (raw))) {
		if (/^[1-9]\d*$/.test(key) && typeof value === 'number' && check(value)) out[key] = value;
	}
	return out;
}

/**
 * Rebuilds a profile from stored data, keeping every valid value and
 * replacing anything missing or malformed with its default.
 * @param {unknown} raw
 * @returns {Profile}
 */
export function sanitizeProfile(raw) {
	const base = defaultProfile();
	if (!isRecord(raw)) return base;
	const r = /** @type {Record<string, any>} */ (raw);

	const owned = Array.isArray(r.owned)
		? [...new Set([...base.owned, ...r.owned.filter((id) => KNOWN.has(id))])]
		: base.owned;
	const stars = levelRecord(r.stars, (v) => Number.isInteger(v) && v >= 1 && v <= 3);
	const highestCleared = Math.max(0, ...Object.keys(stars).map(Number));

	/** @type {Profile['daily']['done']} */
	const done = {};
	if (isRecord(r.daily?.done)) {
		for (const [key, value] of Object.entries(r.daily.done)) {
			if (!DATE_KEY.test(key) || !isRecord(value)) continue;
			const entry = /** @type {Record<string, unknown>} */ (value);
			const stars = count(entry.stars, 0);
			if (stars < 1 || stars > 3) continue;
			done[key] = { moves: count(entry.moves, 0), stars, seconds: count(entry.seconds, 0) };
		}
	}

	/** @type {Record<string, string>} */
	const achievements = {};
	if (isRecord(r.achievements)) {
		for (const [id, when] of Object.entries(r.achievements))
			if (typeof when === 'string') achievements[id] = when;
	}

	const dateOrNull = (/** @type {unknown} */ v) =>
		typeof v === 'string' && DATE_KEY.test(v) ? v : null;

	return {
		coins: count(r.coins, base.coins),
		unlocked: Math.max(count(r.unlocked, 1), highestCleared + 1),
		stars,
		best: levelRecord(r.best, (v) => Number.isInteger(v) && v > 0),
		score: count(r.score, 0),
		hints: count(r.hints, base.hints),
		tubes: count(r.tubes, base.tubes),
		owned,
		theme: owned.includes(r.theme) && THEMES.some((t) => t.id === r.theme) ? r.theme : base.theme,
		skin: owned.includes(r.skin) && SKINS.some((s) => s.id === r.skin) ? r.skin : base.skin,
		settings: fields(base.settings, r.settings, (v, d) => (typeof v === 'boolean' ? v : d)),
		stats: fields(base.stats, r.stats, count),
		achievements,
		daily: {
			done,
			streak: count(r.daily?.streak, 0),
			best: count(r.daily?.best, 0),
			last: dateOrNull(r.daily?.last)
		},
		gift: { last: dateOrNull(r.gift?.last), streak: count(r.gift?.streak, 0) },
		tutorialDone: r.tutorialDone === true,
		saved: r.saved ?? null
	};
}

/** @param {Profile} profile */
export const totalStars = (profile) => Object.values(profile.stars).reduce((sum, s) => sum + s, 0);

/**
 * Local calendar date as YYYY-MM-DD.
 * @param {Date} [date]
 */
export function dateKey(date = new Date()) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/**
 * Whether `later` is the calendar day after `earlier`.
 * @param {string} earlier
 * @param {string} later
 */
export function isNextDay(earlier, later) {
	const next = new Date(`${earlier}T12:00:00`);
	next.setDate(next.getDate() + 1);
	return dateKey(next) === later;
}
