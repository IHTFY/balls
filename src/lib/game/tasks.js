// The heavy work the puzzle worker does, callable on either thread.
import { generatePuzzle } from './generator.js';
import { solve } from './solver.js';

/**
 * @typedef {{ type: 'generate', spec: import('./generator.js').PuzzleSpec, seed: number }
 *   | { type: 'solve', tubes: number[][], capacity: number,
 *       options: import('./solver.js').SolveOptions }} Task
 */

/** @param {Task} task */
export const run = (task) =>
	task.type === 'generate'
		? generatePuzzle(task.spec, task.seed)
		: solve(task.tubes, task.capacity, task.options);
