// Fits the tubes into the board area as large as possible, in one to four rows.

/** Proportions relative to the ball diameter. */
const TUBE_WIDTH = 1.3;
const GAP = 0.42;
const PAD = 0.16;
const LIFT = 1.2;
const ROW_GAP = 0.3;
const MAX_BALL = 74;

/**
 * @typedef {object} TubeBox
 * @property {number} x left edge
 * @property {number} y top edge (the tube mouth)
 * @property {number} w
 * @property {number} h
 */

/**
 * @param {number} count tubes
 * @param {number} capacity balls per tube
 * @param {number} width board width in px
 * @param {number} height board height in px
 */
export function computeLayout(count, capacity, width, height) {
	let best = { rows: 1, ball: 0 };
	for (let rows = 1; rows <= Math.min(4, count); rows++) {
		const perRow = Math.ceil(count / rows);
		const byWidth = width / (perRow * TUBE_WIDTH + (perRow - 1) * GAP + GAP);
		const byHeight = height / (rows * (capacity + 2 * PAD + LIFT) + (rows - 1) * ROW_GAP);
		const ball = Math.min(byWidth, byHeight, MAX_BALL);
		// Prefer fewer rows unless more rows make the balls clearly bigger.
		if (ball > best.ball * 1.08) best = { rows, ball };
	}
	const ball = Math.max(8, Math.floor(best.ball));
	const rows = best.rows;
	const tubeW = ball * TUBE_WIDTH;
	const tubeH = ball * (capacity + 2 * PAD);
	const rowH = tubeH + ball * LIFT;
	const blockH = rows * rowH + (rows - 1) * ball * ROW_GAP;
	const top = Math.max(0, (height - blockH) / 2);

	/** @type {TubeBox[]} */
	const tubes = [];
	const base = Math.floor(count / rows);
	const extra = count % rows;
	for (let r = 0, i = 0; r < rows; r++) {
		const inRow = base + (r < extra ? 1 : 0);
		const rowW = inRow * tubeW + (inRow - 1) * ball * GAP;
		const left = (width - rowW) / 2;
		const y = top + r * (rowH + ball * ROW_GAP) + ball * LIFT;
		for (let c = 0; c < inRow; c++, i++) {
			tubes.push({ x: left + c * (tubeW + ball * GAP), y, w: tubeW, h: tubeH });
		}
	}
	return { ball, rows, tubes, pad: ball * PAD, lift: ball * LIFT };
}

/**
 * Center of the ball at `slot` (0 = bottom) in a tube.
 * @param {TubeBox} tube
 * @param {number} slot
 * @param {number} ball
 * @param {number} pad
 */
export const slotCenter = (tube, slot, ball, pad) => ({
	x: tube.x + tube.w / 2,
	y: tube.y + tube.h - pad - ball * (slot + 0.5)
});
