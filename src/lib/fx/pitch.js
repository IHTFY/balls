// Which sprite sound plays, and how far it is shifted, for pitched effects. They are
// rendered in C major (scripts/sounds/effects.py) and shifted into the key of the
// music: steps count up the scale from the key's tonic.
export const COLORS = 14;
// Picks and drops: C4 up a major scale over two octaves. Completions: one arpeggio
// on each step of the scale from C5.
const NOTES = 14;
// Combos climb a scale step each, up to MAX_COMBO.
const MAX_COMBO = 10;

/**
 * Each music loop's key: how far to shift the C major sprite, and which step of
 * C major is the tonic. A minor uses the notes of C major, starting from A.
 * @type {Record<'menu' | 'play' | 'blitz', { cents: number, tonic: number }>}
 */
export const KEYS = {
	menu: { cents: 500, tonic: 0 }, // F major
	play: { cents: 200, tonic: 0 }, // D major
	blitz: { cents: 0, tonic: -2 } // A minor
};

/** @param {number} c */
export const color = (c) => ((c % COLORS) + COLORS) % COLORS;

/**
 * A pick or drop on a step of C major (0 is C4). Steps outside the sprite's two
 * octaves reuse its note an octave nearer, shifted by the octaves between.
 * @param {'pick' | 'drop'} kind
 * @param {number} step
 */
export function ballNote(kind, step) {
	let index = step;
	let octaves = 0;
	for (; index >= NOTES; index -= 7) octaves++;
	for (; index < 0; index += 7) octaves--;
	return { name: `${kind}${index}`, cents: octaves * 1200 };
}

/**
 * A completion's arpeggio for a combo of this size, on a step of C major (0 is C5).
 * @param {number} combo
 * @param {number} tonic
 */
export function completeNote(combo, tonic) {
	const step = tonic + Math.min(Math.max(combo, 1), MAX_COMBO) - 1;
	const index = ((step % 7) + 7) % 7;
	const octaves = Math.floor(step / 7);
	return { name: `complete${index}`, chime: `chime${index}`, cents: octaves * 1200 };
}
