// Promise wrappers around the puzzle worker, with an in-thread fallback.
import { run } from './game/tasks.js';

/** @typedef {import('./game/generator.js').PuzzleSpec} PuzzleSpec */
/** @typedef {import('./game/generator.js').Puzzle} Puzzle */
/** @typedef {import('./game/solver.js').SolveResult} SolveResult */
/** @typedef {import('./game/tasks.js').Task} Task */

/** @type {Worker | null | undefined} */
let worker;
let nextId = 0;
/** @type {Map<number, { task: Task, resolve: (value: any) => void, reject: (error: unknown) => void }>} */
const pending = new Map();

/** Runs a task on this thread, settling the promise either way. */
function runHere(
	/** @type {Task} */ task,
	/** @type {(v: any) => void} */ resolve,
	/** @type {(e: unknown) => void} */ reject
) {
	try {
		resolve(run(task));
	} catch (error) {
		reject(error);
	}
}

function getWorker() {
	if (worker !== undefined) return worker;
	try {
		worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
		worker.onmessage = ({ data }) => {
			pending.get(data.id)?.resolve(data.result);
			pending.delete(data.id);
		};
		worker.onerror = () => {
			// The worker failed to load or threw: stop using it and finish queued tasks here.
			worker = null;
			for (const { task, resolve, reject } of pending.values()) runHere(task, resolve, reject);
			pending.clear();
		};
	} catch {
		// Module workers are unavailable; every task runs on this thread.
		worker = null;
	}
	return worker;
}

/** @param {Task} task */
function call(task) {
	return new Promise((resolve, reject) => {
		const w = getWorker();
		if (!w) return runHere(task, resolve, reject);
		const id = nextId++;
		pending.set(id, { task, resolve, reject });
		w.postMessage({ id, task });
	});
}

/**
 * @param {PuzzleSpec} spec
 * @param {number} seed
 * @returns {Promise<Puzzle>}
 */
export const generate = (spec, seed) => call({ type: 'generate', spec, seed });

/**
 * @param {number[][]} tubes
 * @param {number} capacity
 * @param {{ maxNodes?: number, weight?: number }} options
 * @returns {Promise<SolveResult>}
 */
export const search = (tubes, capacity, options) =>
	call({ type: 'solve', tubes, capacity, options });
