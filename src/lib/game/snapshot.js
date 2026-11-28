// Checks a saved game before it is resumed.
import {
	canMove,
	dealCovers,
	isTubeComplete,
	MAX_ADDED_TUBES,
	shiftBalls,
	topRun,
	usefulMoves
} from './rules.js';

/** @typedef {{ id: number, color: number, hidden: boolean }} Ball */
/** @typedef {{ from: number, to: number, count: number }} HistoryEntry */
/** @typedef {import('./generator.js').PuzzleSpec} PuzzleSpec */

const isCount = (/** @type {unknown} */ v) => Number.isInteger(v) && /** @type {number} */ (v) >= 0;
const isBall = (/** @type {any} */ b) =>
	b && isCount(b.id) && isCount(b.color) && typeof b.hidden === 'boolean';

/**
 * A saved game is valid when its start could have been dealt for the puzzle it
 * is resumed as, and it is a legal position of that start: the same tubes plus
 * the added ones a puzzle allows, and a history of moves play could make that
 * replays from the start to this board.
 * @param {any} s
 * @param {PuzzleSpec} spec the puzzle the save is for
 * @returns {{ start: Ball[][], tubes: Ball[][] } | null} the board to resume, with
 *   the covers play leaves, or null when the save is not valid
 */
export function resumeBoard(s, spec) {
	if (!s || typeof s !== 'object') return null;
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
	if (!counts.every((k) => isCount(s[k])) || s.capacity < 2) return null;
	const tubesOk = (/** @type {any} */ t) =>
		Array.isArray(t) &&
		t.every((tube) => Array.isArray(tube) && tube.length <= s.capacity && tube.every(isBall));
	if (!tubesOk(s.start) || !tubesOk(s.tubes)) return null;
	// A start of another shape may leave no move at all, so it must have the puzzle's
	// tubes, each color filling exactly one tube's worth, and every ball its own id.
	/** @type {Ball[]} */
	const balls = s.start.flat();
	if (
		s.capacity !== spec.capacity ||
		s.start.length !== spec.colors + spec.empty ||
		balls.length !== spec.colors * spec.capacity ||
		Array.from({ length: spec.colors }, (_, c) => c).some(
			(c) => balls.filter((b) => b.color === c).length !== spec.capacity
		) ||
		new Set(balls.map((b) => b.id)).size !== balls.length
	)
		return null;
	// Every dealt puzzle opens with a move to make, and not out of a finished tube.
	const colors = s.start.map((/** @type {Ball[]} */ tube) => tube.map((b) => b.color));
	if (!usefulMoves(colors, s.capacity).length) return null;
	if (s.tubesAdded > MAX_ADDED_TUBES || s.tubes.length !== s.start.length + s.tubesAdded)
		return null;
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
		return null;
	// Undo walks the history back, so it must replay from the start to this exact
	// board, and the move count must be the balls it moved.
	/** @type {HistoryEntry[]} */
	const history = s.history;
	if (history.reduce((sum, h) => sum + h.count, 0) !== s.moves) return null;
	// Undo leaves uncovered what an undone move uncovered, so a ball may have come into view
	// sooner than the history alone shows; the save's own covers say which.
	const seenInSave = new Set(
		s.tubes
			.flat()
			.filter((/** @type {Ball} */ b) => !b.hidden)
			.map((/** @type {Ball} */ b) => b.id)
	);
	const start = dealCovers(s.start, !!spec.mystery);
	/** @type {Ball[][]} */
	let board = [...start, ...Array.from({ length: s.tubesAdded }, () => [])];
	for (const { from, to, count } of history) {
		const colors = board.map((tube) => tube.map((b) => b.color));
		// Play lifts one ball, or the matching balls in view on top as far as they fit, and
		// never out of a finished tube. A covered ball counts as a color of its own.
		const run = (/** @type {(b: Ball) => boolean} */ seen) =>
			topRun(board[from].map((b) => (seen(b) ? b.color : -1 - b.id)));
		const room = s.capacity - board[to].length;
		const least = Math.min(
			run((b) => !b.hidden),
			room
		);
		const most = Math.min(
			run((b) => !b.hidden || seenInSave.has(b.id)),
			room
		);
		if (
			!canMove(colors, from, to, s.capacity) ||
			isTubeComplete(colors[from], s.capacity) ||
			(count !== 1 && (count < least || count > most))
		)
			return null;
		board = shiftBalls(board, from, to, count, s.capacity).tubes;
	}
	const key = (/** @type {Ball[]} */ tube) => tube.map((b) => `${b.id}:${b.color}`).join();
	if (!board.every((tube, i) => key(tube) === key(s.tubes[i]))) return null;
	// A ball stays covered only where both the replay and the save cover it.
	return {
		start,
		tubes: board.map((tube, i) =>
			tube.map((b, j) => ({ ...b, hidden: b.hidden && s.tubes[i][j].hidden }))
		)
	};
}
