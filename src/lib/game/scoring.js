// Stars, points, coins, and player ranks.

/**
 * Par is close to the shortest solution, which people rarely find, so three
 * stars allow 20% extra moves (at least 2) and two stars allow 60%.
 * @param {number} moves
 * @param {number} par
 */
export function starsFor(moves, par) {
	if (moves <= par + Math.max(2, Math.floor(par * 0.2))) return 3;
	if (moves <= Math.ceil(par * 1.6)) return 2;
	return 1;
}

/**
 * @typedef {object} Result
 * @property {number} colors
 * @property {number} capacity
 * @property {number} moves
 * @property {number} par
 * @property {number} seconds
 * @property {number} bestCombo
 * @property {number} undos
 * @property {number} hints
 * @property {boolean} [boss]
 * @property {boolean} [mystery]
 */

/**
 * Points earned for a solved puzzle, as labelled lines for the results screen.
 * @param {Result} r
 * @returns {{ lines: { label: string, points: number }[], total: number }}
 */
export function scoreFor(r) {
	const balls = r.colors * r.capacity;
	const lines = [{ label: 'Sorted', points: balls * 25 }];
	const efficiency = Math.round((balls * 25 * r.par) / Math.max(r.moves, r.par));
	lines.push({ label: r.moves < r.par ? 'Under par!' : 'Efficiency', points: efficiency });
	if (r.moves < r.par) lines.push({ label: 'Beat par bonus', points: (r.par - r.moves) * 100 });
	const brisk = balls * 4;
	if (r.seconds < brisk) lines.push({ label: 'Speed', points: (brisk - r.seconds) * 10 });
	if (r.bestCombo > 1) lines.push({ label: `Combo ×${r.bestCombo}`, points: r.bestCombo * 150 });
	if (!r.undos && !r.hints) lines.push({ label: 'Flawless', points: 250 });
	if (r.mystery) lines.push({ label: 'Mystery', points: balls * 10 });
	let total = lines.reduce((sum, l) => sum + l.points, 0);
	if (r.boss) {
		lines.push({ label: 'Boss ×2', points: total });
		total *= 2;
	}
	return { lines, total };
}

/**
 * Coins for a level: a first clear pays fully, replays pay only for new stars.
 * @param {number} stars
 * @param {number} previousStars 0 if never cleared
 * @param {boolean} boss
 */
export function levelCoins(stars, previousStars, boss) {
	const multiplier = boss ? 2 : 1;
	if (!previousStars) return (10 + stars * 5) * multiplier;
	return (2 + Math.max(0, stars - previousStars) * 5) * multiplier;
}

/** @param {number} streak days in a row, including today */
export const dailyCoins = (streak) => 50 + 10 * Math.min(streak - 1, 6);

const RANKS = [
	'Pebble',
	'Marble Rookie',
	'Tube Tamer',
	'Color Coordinator',
	'Stack Strategist',
	'Sort Sorcerer',
	'Sphere Sage',
	'Orb Overlord',
	'Prism Paragon',
	'Grandmaster of Balls'
];

/** Lifetime points needed to reach rank level `n` (0-based). */
const rankThreshold = (/** @type {number} */ n) => Math.round(1500 * n ** 1.6);

/**
 * @param {number} score lifetime points
 */
export function rankFor(score) {
	let level = 0;
	while (score >= rankThreshold(level + 1)) level++;
	const floor = rankThreshold(level);
	const next = rankThreshold(level + 1);
	return {
		level: level + 1,
		title: RANKS[Math.min(level, RANKS.length - 1)],
		progress: (score - floor) / (next - floor),
		toNext: next - score
	};
}
