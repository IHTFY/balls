import assert from 'node:assert/strict';
import { test } from 'node:test';

let fresh = 0;

/**
 * @param {import('node:test').TestContext} t
 * @param {number} fps
 * @param {'confetti' | 'burst'} effect
 */
async function replay(t, fps, effect) {
	t.mock.method(Math, 'random', () => 0.5);
	t.mock.method(performance, 'now', () => 0);
	/** @type {FrameRequestCallback | undefined} */
	let scheduled;
	/** @type {{ x: number, y: number }[]} */
	let positions = [];
	const record = (/** @type {number} */ x, /** @type {number} */ y) => positions.push({ x, y });
	const context = new Proxy(
		{ translate: record, arc: record },
		{
			get(target, key) {
				return Reflect.get(target, key) ?? (() => {});
			}
		}
	);
	Object.assign(globalThis, {
		window: { devicePixelRatio: 1 },
		innerWidth: 400,
		innerHeight: 800,
		addEventListener: () => {},
		removeEventListener: () => {},
		cancelAnimationFrame: () => {},
		requestAnimationFrame: (/** @type {FrameRequestCallback} */ callback) => {
			scheduled = callback;
			return 1;
		}
	});
	const particles = await import(`../src/lib/fx/particles.js?${fresh++}`);
	// Only the canvas methods used by particle rendering are needed here.
	const canvas = /** @type {HTMLCanvasElement} */ (
		/** @type {unknown} */ ({ getContext: () => context })
	);
	const detach = particles.attachCanvas(canvas);
	try {
		if (effect === 'confetti') particles.confetti(['#fff'], 1);
		else particles.burst(200, 400, ['#fff'], 2);
		for (let i = 1; i <= fps / 2; i++) {
			positions = [];
			assert.ok(scheduled);
			scheduled((i * 1000) / fps);
		}
		assert.ok(positions.length > 0);
		return positions;
	} finally {
		detach();
	}
}

for (const effect of /** @type {const} */ (['confetti', 'burst'])) {
	test(`${effect} follows the same path after 500 ms at 30, 60, and 120 FPS`, async (t) => {
		const slow = await replay(t, 30, effect);
		const normal = await replay(t, 60, effect);
		const fast = await replay(t, 120, effect);
		assert.equal(slow.length, normal.length);
		assert.equal(slow.length, fast.length);
		for (let i = 0; i < slow.length; i++) {
			for (const axis of /** @type {const} */ (['x', 'y'])) {
				assert.ok(
					Math.abs(slow[i][axis] - fast[i][axis]) <= 2,
					`${effect} ${axis} after 500 ms: 30 FPS=${slow[i][axis]}, 120 FPS=${fast[i][axis]}; expected within 2 px`
				);
				assert.ok(Math.abs(normal[i][axis] - fast[i][axis]) <= 2);
			}
		}
	});
}

test('confetti keeps its original 60 FPS path', async (t) => {
	const [position] = await replay(t, 60, 'confetti');
	// Characterization of the original 60 FPS motion, using the geometric sum and gravity.
	const x = -10 + ((390 / 60) * 0.985 * (1 - 0.985 ** 30)) / (1 - 0.985);
	const y = 680 - 750 * 0.5 + ((700 / 60 ** 2) * 30 * 31) / 2;
	assert.ok(Math.abs(position.x - x) < 1e-9);
	assert.ok(Math.abs(position.y - y) < 1e-9);
});

test('stars and sparks keep their original 60 FPS path', async (t) => {
	const positions = await replay(t, 60, 'burst');
	// Characterization of the original damped velocity sum, including gravity.
	const dampedSum = (0.96 * (1 - 0.96 ** 30)) / (1 - 0.96);
	const terminalVelocity = ((500 / 60) * 0.96) / (1 - 0.96);
	const x = 200 - (260 / 60) * dampedSum;
	const y = 400 + terminalVelocity * 0.5 + ((-60 - terminalVelocity) / 60) * dampedSum;
	assert.equal(positions.length, 2);
	for (const position of positions) {
		assert.ok(Math.abs(position.x - x) < 1e-9);
		assert.ok(Math.abs(position.y - y) < 1e-9);
	}
});
