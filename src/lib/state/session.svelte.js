// Starts puzzles in each mode, pays out rewards, and saves unfinished games.
import {
	blitzSpec,
	chapterName,
	chapterOf,
	dailySeed,
	dailySpec,
	levelSeed,
	levelSpec,
	ZEN_PRESETS
} from '../game/levels.js';
import { dateKey, isNextDay } from '../game/profile.js';
import { dailyCoins, levelCoins, rankFor, scoreFor, starsFor } from '../game/scoring.js';
import { generate, search } from '../puzzles.js';
import { Game } from './game.svelte.js';
import { checkAchievements, earn, profile, spend } from './profile.svelte.js';

/** @typedef {'level' | 'daily' | 'zen' | 'blitz'} Mode */
/** @typedef {import('../game/generator.js').PuzzleSpec & { boss?: boolean }} Spec */

export const HINT_PRICE = 25;
export const TUBE_PRICE = 100;
export const MAX_ADDED_TUBES = 2;
const BLITZ_SECONDS = 90;

/**
 * @typedef {object} Result
 * @property {Mode} mode
 * @property {string} title
 * @property {number} stars
 * @property {number} previousStars
 * @property {number} moves
 * @property {number} par
 * @property {number} seconds
 * @property {{ label: string, points: number }[]} lines
 * @property {number} score
 * @property {number} coins
 * @property {boolean} newBest
 * @property {ReturnType<typeof rankFor>} rankBefore
 * @property {ReturnType<typeof rankFor>} rankAfter
 * @property {number} [streak]
 * @property {number} [solved] blitz puzzles solved
 */

export const game = new Game(() => profile.settings.stacks);

export const session = $state({
	/** @type {Mode} */
	mode: 'level',
	level: 1,
	date: '',
	/** @type {keyof typeof ZEN_PRESETS} */
	preset: 'easy',
	seed: 0,
	colors: 0,
	boss: false,
	mystery: false,
	loading: false,
	hintBusy: false,
	/** @type {Result | null} */
	result: null,
	blitz: { left: 0, solved: 0, score: 0, over: false, lastGain: 0 }
});

let token = 0;
/** @type {Promise<import('../puzzles.js').Puzzle> | null} */
let upcoming = null;

const randomSeed = () => Math.floor(Math.random() * 2 ** 32);

/**
 * @param {Mode} mode
 * @param {Spec} spec
 * @param {number} seed
 * @param {Promise<import('../puzzles.js').Puzzle>} [ready] a puzzle already being generated
 */
async function begin(mode, spec, seed, ready) {
	const mine = ++token;
	session.mode = mode;
	session.seed = seed;
	session.colors = spec.colors;
	session.boss = !!spec.boss;
	session.mystery = !!spec.mystery;
	session.result = null;
	session.loading = true;
	const puzzle = await (ready ?? generate(spec, seed));
	if (mine !== token) return;
	game.load(puzzle.tubes, puzzle.capacity, puzzle.par, puzzle.mystery);
	session.loading = false;
	save();
}

/**
 * Picks up a saved game for the same puzzle when there is one.
 * @param {(saved: any) => boolean} matches
 */
function resume(matches) {
	const saved = /** @type {any} */ (profile.saved);
	if (!saved || !matches(saved)) return false;
	token++;
	if (!game.restore($state.snapshot(saved.game))) {
		profile.saved = null;
		return false;
	}
	Object.assign(session, {
		seed: saved.seed,
		colors: saved.colors,
		boss: saved.boss,
		mystery: saved.mystery,
		result: null,
		loading: false
	});
	return true;
}

/** @param {number} level */
export function startLevel(level) {
	session.level = level;
	session.mode = 'level';
	if (resume((s) => s.mode === 'level' && s.level === level)) return;
	begin('level', levelSpec(level), levelSeed(level));
}

export function startDaily() {
	const today = dateKey();
	session.date = today;
	session.mode = 'daily';
	if (resume((s) => s.mode === 'daily' && s.date === today)) return;
	begin('daily', dailySpec(today), dailySeed(today));
}

/** @param {keyof typeof ZEN_PRESETS} preset */
export function startZen(preset, fresh = false) {
	session.preset = preset;
	session.mode = 'zen';
	if (!fresh && resume((s) => s.mode === 'zen' && s.preset === preset)) return;
	begin('zen', ZEN_PRESETS[preset].spec, randomSeed());
}

export function startBlitz() {
	session.blitz = { left: BLITZ_SECONDS, solved: 0, score: 0, over: false, lastGain: 0 };
	upcoming = null;
	begin('blitz', blitzSpec(0), randomSeed());
}

/** Plays the same puzzle again from the start. */
export function replay() {
	if (session.mode === 'blitz') return startBlitz();
	if (session.mode === 'zen') return begin('zen', ZEN_PRESETS[session.preset].spec, session.seed);
	game.load(
		game.start.map((t) => t.map((b) => b.color)),
		game.capacity,
		game.par,
		session.mystery
	);
	session.result = null;
	save();
}

/** The next puzzle in the current mode. */
export function next() {
	if (session.mode === 'level') startLevel(session.level + 1);
	else if (session.mode === 'zen') startZen(session.preset, true);
	else if (session.mode === 'blitz') startBlitz();
}

export const title = () => {
	if (session.mode === 'level') return `Level ${session.level}`;
	if (session.mode === 'daily') return 'Daily Challenge';
	if (session.mode === 'zen') return `Zen · ${ZEN_PRESETS[session.preset].label}`;
	return 'Blitz';
};

export const subtitle = () =>
	session.mode === 'level'
		? chapterName(chapterOf(session.level))
		: session.mode === 'daily'
			? session.date
			: '';

/** Saves the game in progress so closing the app never loses it. */
export function save() {
	if (session.mode === 'blitz' || game.won || session.loading) return;
	profile.saved = {
		mode: session.mode,
		level: session.level,
		date: session.date,
		preset: session.preset,
		seed: session.seed,
		colors: session.colors,
		boss: session.boss,
		mystery: session.mystery,
		game: game.snapshot()
	};
}

/** Whether a saved game exists for the given level. */
/**
 * Whether a started game is saved that matches, such as one for a given level.
 * @param {(saved: any) => boolean} matches
 */
export const hasSave = (matches) => {
	const s = /** @type {any} */ (profile.saved);
	return !!s && s.game?.moves > 0 && matches(s);
};

/** One second of play. */
export function tick() {
	if (session.loading || game.won || session.result) return;
	game.seconds++;
	profile.stats.seconds++;
	if (session.mode !== 'blitz' || session.blitz.over) return;
	session.blitz.left--;
	if (session.blitz.left <= 0) endBlitz();
}

function baseResult() {
	return {
		colors: session.colors,
		capacity: game.capacity,
		moves: game.moves,
		par: game.par,
		seconds: game.seconds,
		bestCombo: game.bestCombo,
		undos: game.undos,
		hints: game.hintsUsed,
		boss: session.boss,
		mystery: session.mystery
	};
}

/** Records a solved puzzle and prepares the results screen. */
export function finish() {
	const r = baseResult();
	const stats = profile.stats;
	const stars = starsFor(r.moves, r.par);
	stats.solved++;
	stats.moves += r.moves;
	stats.bestCombo = Math.max(stats.bestCombo, r.bestCombo);
	if (r.colors >= 5 && (!stats.fastest || r.seconds < stats.fastest)) stats.fastest = r.seconds;
	if (!r.undos && !r.hints) stats.flawless++;
	if (r.mystery) stats.mysterySolved++;
	if (stars === 3) stats.perfect++;
	if (r.moves < r.par) stats.underPar++;

	if (session.mode === 'blitz') return blitzSolved(r);

	const { lines, total } = scoreFor(r);
	const rankBefore = rankFor(profile.score);
	profile.score += total;
	let coins = 0;
	let previousStars = 0;
	let newBest = false;
	/** @type {number | undefined} */
	let streak;

	if (session.mode === 'level') {
		const key = String(session.level);
		previousStars = profile.stars[key] ?? 0;
		coins = levelCoins(stars, previousStars, session.boss);
		profile.stars[key] = Math.max(previousStars, stars);
		newBest = !profile.best[key] || r.moves < profile.best[key];
		if (newBest) profile.best[key] = r.moves;
		profile.unlocked = Math.max(profile.unlocked, session.level + 1);
		if (session.boss) stats.bossesBeaten++;
	} else if (session.mode === 'daily') {
		const today = session.date;
		const before = profile.daily.done[today];
		previousStars = before?.stars ?? 0;
		if (!before) {
			const d = profile.daily;
			d.streak = d.last && isNextDay(d.last, today) ? d.streak + 1 : 1;
			d.best = Math.max(d.best, d.streak);
			d.last = today;
			coins = dailyCoins(d.streak);
			stats.dailySolved++;
		}
		newBest = !before || r.moves < before.moves;
		if (newBest) profile.daily.done[today] = { moves: r.moves, stars, seconds: r.seconds };
		streak = profile.daily.streak;
	} else {
		coins = 5 + r.colors;
		stats.zenSolved++;
	}

	earn(coins);
	profile.saved = null;
	checkAchievements();
	session.result = {
		mode: session.mode,
		title: title(),
		stars,
		previousStars,
		moves: r.moves,
		par: r.par,
		seconds: r.seconds,
		lines,
		score: total,
		coins,
		newBest,
		rankBefore,
		rankAfter: rankFor(profile.score),
		streak
	};
}

/** @param {ReturnType<typeof baseResult>} r */
function blitzSolved(r) {
	const b = session.blitz;
	const gain = scoreFor(r).total;
	b.score += gain;
	b.lastGain = gain;
	b.solved++;
	b.left += 6 + r.colors;
	const spec = blitzSpec(b.solved);
	const seed = randomSeed();
	// A short pause lets the win celebration play before the next board drops in.
	const ready = upcoming ?? generate(spec, seed);
	upcoming = null;
	setTimeout(() => {
		if (session.mode !== 'blitz' || b.over) return;
		begin('blitz', spec, seed, ready).then(() => {
			upcoming = generate(blitzSpec(b.solved + 1), randomSeed());
		});
	}, 900);
}

function endBlitz() {
	const b = session.blitz;
	b.over = true;
	b.left = 0;
	const stats = profile.stats;
	stats.blitzRuns++;
	const newBest = b.score > stats.blitzBest;
	stats.blitzBest = Math.max(stats.blitzBest, b.score);
	stats.blitzMostSolved = Math.max(stats.blitzMostSolved, b.solved);
	const rankBefore = rankFor(profile.score);
	profile.score += b.score;
	const coins = Math.floor(b.score / 150);
	earn(coins);
	checkAchievements();
	session.result = {
		mode: 'blitz',
		title: 'Time!',
		stars: 0,
		previousStars: 0,
		moves: 0,
		par: 0,
		seconds: 0,
		lines: [],
		score: b.score,
		coins,
		newBest,
		rankBefore,
		rankAfter: rankFor(profile.score),
		solved: b.solved
	};
}

/**
 * Shows the next move of a solution from the current position.
 * @returns {Promise<'ok' | 'empty' | 'deadEnd' | 'busy' | 'unknown'>}
 */
export async function requestHint() {
	if (session.hintBusy || game.won || session.loading) return 'busy';
	if (profile.hints <= 0) {
		if (!spend(HINT_PRICE)) return 'empty';
		profile.hints++;
	}
	session.hintBusy = true;
	const version = game.version;
	const result = await search(game.colorTubes, game.capacity, { weight: 1.5, maxNodes: 80_000 });
	session.hintBusy = false;
	if (version !== game.version) return 'busy';
	if (result.status === 'solved' && result.moves.length) {
		const [from, to] = result.moves[0];
		game.selected = -1;
		game.hint = { from, to };
		profile.hints--;
		game.hintsUsed++;
		profile.stats.hintsUsed++;
		return 'ok';
	}
	if (result.status === 'unsolvable') {
		game.deadEnd = true;
		return 'deadEnd';
	}
	return 'unknown';
}

/** @returns {'ok' | 'empty' | 'max'} */
export function addTube() {
	if (game.tubesAdded >= MAX_ADDED_TUBES || game.won) return 'max';
	if (profile.tubes > 0) profile.tubes--;
	else if (!spend(TUBE_PRICE)) return 'empty';
	game.addTube();
	profile.stats.tubesAdded++;
	save();
	return 'ok';
}

/** Warns early when the position can no longer be solved. */
export function checkDeadEnd() {
	if (!profile.settings.deadEnd || game.won) return;
	const version = game.version;
	search(game.colorTubes, game.capacity, { weight: 2, maxNodes: 15_000 }).then((r) => {
		if (version === game.version && r.status === 'unsolvable') game.deadEnd = true;
	});
}

/** Daily gift rewards for days 1–7 of a login streak. */
export const GIFTS = [
	{ coins: 30 },
	{ hints: 1 },
	{ coins: 50 },
	{ tubes: 1 },
	{ coins: 80 },
	{ hints: 2 },
	{ coins: 150, tubes: 1 }
];

export const giftReady = () => profile.gift.last !== dateKey();

/** The gift streak day (1–7) that claiming today would pay. */
export function giftDay() {
	const { last, streak } = profile.gift;
	const continues = last && isNextDay(last, dateKey());
	return continues ? (streak % GIFTS.length) + 1 : 1;
}

export function claimGift() {
	if (!giftReady()) return null;
	const day = giftDay();
	const gift = GIFTS[day - 1];
	profile.gift = { last: dateKey(), streak: day };
	if (gift.coins) earn(gift.coins);
	if (gift.hints) profile.hints += gift.hints;
	if (gift.tubes) profile.tubes += gift.tubes;
	checkAchievements();
	return gift;
}
