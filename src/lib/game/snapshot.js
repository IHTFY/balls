// Checks a saved game before it is resumed.

/** @typedef {{ id: number, color: number, hidden: boolean }} Ball */
/** @typedef {{ from: number, to: number, count: number }} HistoryEntry */

const isCount = (/** @type {unknown} */ v) => Number.isInteger(v) && /** @type {number} */ (v) >= 0;
const isBall = (/** @type {any} */ b) =>
	b && isCount(b.id) && isCount(b.color) && typeof b.hidden === 'boolean';

/**
 * A saved game is valid when it is a legal position of its own start: the same
 * tubes plus any added ones, nothing overfull, and a history that replays from
 * the start to this board.
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
	if (
		!Array.isArray(s.history) ||
		!s.history.every(
			(/** @type {any} */ h) =>
				h &&
				isCount(h.from) &&
				isCount(h.to) &&
				h.from < s.tubes.length &&
				h.to < s.tubes.length &&
				Number.isInteger(h.count) &&
				h.count > 0
		)
	)
		return false;
	// Undo walks the history back, so it must replay from the start to this exact
	// board, and the move count must be the balls it moved.
	/** @type {HistoryEntry[]} */
	const history = s.history;
	if (history.reduce((sum, h) => sum + h.count, 0) !== s.moves) return false;
	/** @type {Ball[][]} */
	const board = [...s.start, ...Array.from({ length: s.tubesAdded }, () => [])].map((t) => [...t]);
	for (const { from, to, count } of history) {
		if (board[from].length < count || board[to].length + count > s.capacity) return false;
		board[to].push(...board[from].splice(board[from].length - count));
	}
	const key = (/** @type {Ball[]} */ tube) => tube.map((b) => `${b.id}:${b.color}`).join();
	return board.every((tube, i) => key(tube) === key(s.tubes[i]));
}
