// Which sprite sound plays, and how far it is raised, for effects that climb a scale.
// The colors' notes run up a major scale over two octaves (scripts/sounds/effects.py).
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
export const COLORS = 14;
// Combos climb a scale step each, up to MAX_COMBO; past the sprite's last one it is raised.
const MAX_COMBO = 10;
const SPRITE_COMBOS = 7;

/** @param {number} step scale steps from the tonic */
const semitones = (step) => MAJOR[step % 7] + 12 * Math.floor(step / 7);

/** @param {number} c */
export const color = (c) => ((c % COLORS) + COLORS) % COLORS;

/**
 * A ball's drop, a number of scale steps above its color's note. Steps past the
 * top color reuse the note an octave down, raised by an octave.
 * @param {number} c
 * @param {number} steps
 */
export function dropNote(c, steps) {
	let degree = color(c) + steps;
	let octaves = 0;
	while (degree >= COLORS) {
		degree -= 7;
		octaves++;
	}
	return { name: `drop${degree}`, cents: octaves * 1200 };
}

/** @param {number} combo */
export function completeNote(combo) {
	const n = Math.min(Math.max(combo, 1), MAX_COMBO);
	const sprite = Math.min(n, SPRITE_COMBOS);
	return { name: `complete${sprite}`, cents: (semitones(n - 1) - semitones(sprite - 1)) * 100 };
}
