// The level curve: how many colors, how tall the tubes, and which twists.
import { hashString } from './rng.js';

export const LEVELS_PER_CHAPTER = 20;
export const MAX_COLORS = 14;

const CHAPTERS = [
	'First Drops',
	'Bubble Bay',
	'Marble Mile',
	'Neon Alley',
	'Crystal Caves',
	'Comet Coast',
	'Gumball Grove',
	'Prism Peaks',
	'Velvet Void',
	'Infinity Lab'
];

/** @param {number} level */
export const chapterOf = (level) => Math.floor((level - 1) / LEVELS_PER_CHAPTER);

/** @param {number} chapter */
export const chapterName = (chapter) =>
	chapter < CHAPTERS.length
		? CHAPTERS[chapter]
		: `${CHAPTERS[CHAPTERS.length - 1]} ${chapter - CHAPTERS.length + 2}`;

/** @param {number} level */
export const isBoss = (level) => level % 10 === 0;

/**
 * @param {number} level 1-based
 * @returns {import('./generator.js').PuzzleSpec & { boss: boolean }}
 */
export function levelSpec(level) {
	const boss = isBoss(level);
	if (level === 1) return { colors: 2, capacity: 3, empty: 1, boss };
	if (level === 2) return { colors: 3, capacity: 3, empty: 2, boss };

	let colors = Math.min(MAX_COLORS, 3 + Math.floor(level / 5));
	let capacity = 4;
	let empty = 2;
	let mystery = false;

	// Twists arrive one at a time, then mix.
	if (level >= 15 && level % 5 === 3) mystery = true;
	if (level >= 30 && level % 6 === 1) {
		capacity = 5;
		colors -= 2;
	}
	if (level >= 45 && level % 7 === 4 && !mystery) {
		empty = 1;
		colors = Math.min(colors, 7);
	}
	if (boss) colors = Math.min(MAX_COLORS, colors + 2);
	// Past the hand-tuned curve, keep large boards from repeating the same shape.
	if (level > 60 && colors >= MAX_COLORS && level % 3 === 0) {
		capacity = 5;
		colors = 11;
	}
	return { colors, capacity, empty, mystery, boss };
}

/** @param {number} level */
export const levelSeed = (level) => hashString(`balls-level-${level}`);

/** @param {string} dateKey YYYY-MM-DD */
export function dailySpec(dateKey) {
	const day = new Date(`${dateKey}T12:00:00`).getDay();
	// Weekday challenges ramp up to a big weekend board.
	const colors = [12, 7, 8, 9, 10, 9, 11][day];
	return {
		colors,
		capacity: day === 3 ? 5 : 4,
		empty: 2,
		mystery: day === 5,
		boss: day === 0 || day === 6
	};
}

/** @param {string} dateKey */
export const dailySeed = (dateKey) => hashString(`balls-daily-${dateKey}`);

/** @type {Record<string, { label: string, icon: string, spec: import('./generator.js').PuzzleSpec }>} */
export const ZEN_PRESETS = {
	easy: { label: 'Chill', icon: '🌱', spec: { colors: 5, capacity: 4, empty: 2 } },
	medium: { label: 'Steady', icon: '🌿', spec: { colors: 8, capacity: 4, empty: 2 } },
	hard: { label: 'Tricky', icon: '🌳', spec: { colors: 11, capacity: 4, empty: 2 } },
	expert: { label: 'Wild', icon: '🌋', spec: { colors: 10, capacity: 5, empty: 2, mystery: true } }
};

/**
 * Blitz boards grow as the run goes on.
 * @param {number} solved puzzles finished so far in this run
 */
export const blitzSpec = (solved) => ({
	colors: Math.min(8, 3 + Math.floor(solved / 2)),
	capacity: 4,
	empty: 2
});
