// Checks a saved game before it is resumed.

/** @typedef {{ id: number, color: number, hidden: boolean }} Ball */

const isCount = (/** @type {unknown} */ v) => Number.isInteger(v) && /** @type {number} */ (v) >= 0;
const isBall = (/** @type {any} */ b) =>
	b && isCount(b.id) && isCount(b.color) && typeof b.hidden === 'boolean';

/**
 * A saved game is valid when it is a legal position of its own start: the same
 * balls, the same tubes plus any added ones, nothing overfull, and a history
 * that only names existing tubes.
 * @param {any} s
 */
export function validSnapshot(s) {
	if (!s || typeof s !== 'object') return false;
	const counts = [
		'capacity',
		'par',
		'moves',
		'seconds',
		'undos',
		'hintsUsed',
		'tubesAdded',
		'bestCombo'
	];
	if (!counts.every((k) => isCount(s[k])) || s.capacity < 2) return false;
	const tubesOk = (/** @type {any} */ t) =>
		Array.isArray(t) &&
		t.every((tube) => Array.isArray(tube) && tube.length <= s.capacity && tube.every(isBall));
	if (!tubesOk(s.start) || !tubesOk(s.tubes)) return false;
	if (s.tubes.length !== s.start.length + s.tubesAdded) return false;
	const ids = (/** @type {Ball[][]} */ t) =>
		t
			.flat()
			.map((b) => `${b.id}:${b.color}`)
			.sort()
			.join();
	if (ids(s.start) !== ids(s.tubes)) return false;
	return (
		Array.isArray(s.history) &&
		s.history.every(
			(/** @type {any} */ h) =>
				h &&
				isCount(h.from) &&
				isCount(h.to) &&
				h.from < s.tubes.length &&
				h.to < s.tubes.length &&
				Number.isInteger(h.count) &&
				h.count > 0
		)
	);
}
