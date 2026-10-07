// One puzzle in play: the board, move history, and the events effects react to.
import { canMove, isSolved, isTubeComplete, topRun, usefulMoves } from '../game/rules.js';
import { validSnapshot } from '../game/snapshot.js';

/** @typedef {import('../game/snapshot.js').Ball} Ball */
/** @typedef {{ from: number, to: number, count: number }} HistoryEntry */

/**
 * @typedef {{ type: 'select', tube: number }
 *   | { type: 'deselect', tube: number }
 *   | { type: 'invalid', tube: number }
 *   | { type: 'move', from: number, to: number, balls: Ball[] }
 *   | { type: 'reveal', tube: number }
 *   | { type: 'complete', tube: number, color: number, combo: number }
 *   | { type: 'win' }
 *   | { type: 'undo', from: number, to: number }
 *   | { type: 'restart' }
 *   | { type: 'addTube' }} GameEvent
 */

/**
 * @typedef {object} Snapshot
 * @property {Ball[][]} start
 * @property {Ball[][]} tubes
 * @property {HistoryEntry[]} history
 * @property {number} capacity
 * @property {number} par
 * @property {number} moves
 * @property {number} seconds
 * @property {number} undos
 * @property {number} hintsUsed
 * @property {number} tubesAdded
 * @property {number} bestCombo
 */

/** Two tube completions this many moves apart or closer build a combo. */
const COMBO_WINDOW = 4;

/** @param {Ball[]} tube */
const colorsOf = (tube) => tube.map((b) => b.color);

export class Game {
	/** @type {Ball[][]} */
	tubes = $state.raw([]);
	/** @type {HistoryEntry[]} */
	history = $state.raw([]);
	capacity = $state(4);
	par = $state(0);
	selected = $state(-1);
	moves = $state(0);
	seconds = $state(0);
	combo = $state(0);
	bestCombo = $state(0);
	undos = $state(0);
	hintsUsed = $state(0);
	tubesAdded = $state(0);
	won = $state(false);
	/** @type {{ from: number, to: number } | null} */
	hint = $state.raw(null);
	deadEnd = $state(false);
	/** Bumped on every position change so stale async results can be ignored. */
	version = $state(0);

	colorTubes = $derived(this.tubes.map(colorsOf));
	/**
	 * The board as the player sees it: each hidden ball counts as a color of its
	 * own, so nothing the player does or is told depends on what is still hidden.
	 */
	knownTubes = $derived(
		this.tubes.map((tube) => tube.map((b) => (b.hidden ? -1 - b.id : b.color)))
	);
	stuck = $derived(
		!this.won && this.tubes.length > 0 && usefulMoves(this.knownTubes, this.capacity).length === 0
	);
	hasHidden = $derived(this.tubes.some((tube) => tube.some((b) => b.hidden)));

	/** @type {Ball[][]} */
	start = $state.raw([]);
	lastComplete = -Infinity;
	/** @type {Set<(event: GameEvent) => void>} */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- subscribers, not UI state
	listeners = new Set();

	/** @param {() => boolean} stacks whether whole same-color runs move at once */
	constructor(stacks) {
		this.stacks = stacks;
	}

	/** @param {(event: GameEvent) => void} listener */
	on(listener) {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/** @param {GameEvent} event */
	emit(event) {
		for (const listener of this.listeners) listener(event);
	}

	/**
	 * @param {number[][]} tubes
	 * @param {number} capacity
	 * @param {number} par
	 * @param {boolean} mystery hide every ball below the top
	 */
	load(tubes, capacity, par, mystery) {
		let id = 0;
		this.start = tubes.map((tube) =>
			tube.map((color, i) => ({ id: id++, color, hidden: mystery && i < tube.length - 1 }))
		);
		this.capacity = capacity;
		this.par = par;
		this.seconds = 0;
		this.undos = 0;
		this.hintsUsed = 0;
		this.tubesAdded = 0;
		this.bestCombo = 0;
		this.reset();
	}

	reset() {
		this.tubes = [...this.start, ...Array.from({ length: this.tubesAdded }, () => [])];
		this.history = [];
		this.selected = -1;
		this.moves = 0;
		this.combo = 0;
		this.won = false;
		this.hint = null;
		this.deadEnd = false;
		this.lastComplete = -Infinity;
		this.version++;
	}

	restart() {
		if (!this.history.length) return;
		this.reset();
		this.emit({ type: 'restart' });
	}

	/** @param {number} i */
	isComplete(i) {
		return isTubeComplete(this.colorTubes[i], this.capacity);
	}

	/** How many balls lift from tube `i` when it is selected. */
	liftCount(/** @type {number} */ i) {
		return this.stacks() ? topRun(this.knownTubes[i]) : 1;
	}

	/** @param {number} i */
	canPick(i) {
		return this.tubes[i].length > 0 && !this.isComplete(i);
	}

	/**
	 * Tapping a tube picks up its top ball, drops a held ball into it, or
	 * switches to it when the drop is not allowed.
	 * @param {number} i
	 */
	tap(i) {
		if (this.won || !this.tubes[i]) return;
		const held = this.selected;
		if (held === -1) {
			if (this.canPick(i)) {
				this.selected = i;
				this.emit({ type: 'select', tube: i });
			} else this.emit({ type: 'invalid', tube: i });
			return;
		}
		if (held === i) {
			this.selected = -1;
			this.emit({ type: 'deselect', tube: i });
			return;
		}
		if (canMove(this.colorTubes, held, i, this.capacity)) {
			this.move(held, i);
			return;
		}
		this.emit({ type: 'invalid', tube: i });
		this.selected = -1;
		this.emit({ type: 'deselect', tube: held });
		if (this.canPick(i)) {
			this.selected = i;
			this.emit({ type: 'select', tube: i });
		}
	}

	/**
	 * @param {number} from
	 * @param {number} to
	 */
	move(from, to) {
		const source = this.tubes[from];
		const target = this.tubes[to];
		const count = Math.min(this.liftCount(from), this.capacity - target.length);
		const balls = source.slice(source.length - count);
		const rest = source.slice(0, source.length - count);
		const uncovered = rest[rest.length - 1];
		if (uncovered?.hidden) rest[rest.length - 1] = { ...uncovered, hidden: false };

		// A finished tube shows its true color, so its hidden balls are revealed too.
		let filled = [...target, ...balls];
		const sealed = isTubeComplete(colorsOf(filled), this.capacity) && filled.some((b) => b.hidden);
		if (sealed) filled = filled.map((b) => (b.hidden ? { ...b, hidden: false } : b));

		const tubes = [...this.tubes];
		tubes[from] = rest;
		tubes[to] = filled;
		this.tubes = tubes;
		this.history = [...this.history, { from, to, count }];
		this.moves += count;
		this.selected = -1;
		this.hint = null;
		this.deadEnd = false;
		this.version++;

		this.emit({ type: 'move', from, to, balls });
		if (uncovered?.hidden) this.emit({ type: 'reveal', tube: from });
		if (sealed) this.emit({ type: 'reveal', tube: to });
		if (this.isComplete(to)) {
			this.combo = this.moves - this.lastComplete <= COMBO_WINDOW + count ? this.combo + 1 : 1;
			this.lastComplete = this.moves;
			this.bestCombo = Math.max(this.bestCombo, this.combo);
			this.emit({ type: 'complete', tube: to, color: balls[0].color, combo: this.combo });
		}
		if (isSolved(this.colorTubes, this.capacity)) {
			this.won = true;
			this.emit({ type: 'win' });
		}
	}

	undo() {
		const last = this.history[this.history.length - 1];
		if (!last || this.won) return false;
		const { from, to, count } = last;
		const tubes = [...this.tubes];
		const balls = tubes[to].slice(tubes[to].length - count);
		tubes[to] = tubes[to].slice(0, tubes[to].length - count);
		tubes[from] = [...tubes[from], ...balls];
		this.tubes = tubes;
		this.history = this.history.slice(0, -1);
		this.moves -= count;
		this.undos++;
		this.selected = -1;
		this.hint = null;
		this.deadEnd = false;
		this.combo = 0;
		this.lastComplete = -Infinity;
		this.version++;
		this.emit({ type: 'undo', from, to });
		return true;
	}

	addTube() {
		this.tubes = [...this.tubes, []];
		this.tubesAdded++;
		this.selected = -1;
		this.hint = null;
		this.deadEnd = false;
		this.version++;
		this.emit({ type: 'addTube' });
	}

	/** @returns {Snapshot} */
	snapshot() {
		return {
			start: this.start,
			tubes: this.tubes,
			history: this.history,
			capacity: this.capacity,
			par: this.par,
			moves: this.moves,
			seconds: this.seconds,
			undos: this.undos,
			hintsUsed: this.hintsUsed,
			tubesAdded: this.tubesAdded,
			bestCombo: this.bestCombo
		};
	}

	/** @param {any} s a saved snapshot, checked before use */
	restore(s) {
		if (!validSnapshot(s)) return false;
		this.start = s.start;
		this.capacity = s.capacity;
		this.par = s.par;
		this.tubesAdded = s.tubesAdded;
		this.reset();
		this.tubes = s.tubes;
		this.history = s.history;
		this.moves = s.moves;
		this.seconds = s.seconds;
		this.undos = s.undos;
		this.hintsUsed = s.hintsUsed;
		this.bestCombo = s.bestCombo;
		this.won = isSolved(this.colorTubes, this.capacity);
		return !this.won;
	}
}
