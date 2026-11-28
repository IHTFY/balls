import assert from 'node:assert/strict';
import { test } from 'node:test';

let fresh = 0;

/**
 * @param {import('node:test').TestContext} t
 * @param {'confetti' | 'burst'} effect
 * @param {number[]} timestamps
 * @param {number} [started]
 */
async function animate(t, effect, timestamps, started = 0) {
	t.mock.method(Math, 'random', () => 0.5);
	t.mock.method(performance, 'now', () => started);
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
	const frames = [];
	try {
		if (effect === 'confetti') particles.confetti(['#fff'], 1);
		else particles.burst(200, 400, ['#fff'], 2);
		for (const now of timestamps) {
			positions = [];
			assert.ok(scheduled);
			scheduled(now);
			frames.push(positions);
		}
		assert.ok(positions.length > 0);
		return frames;
	} finally {
		detach();
	}
}

/**
 * @param {import('node:test').TestContext} t
 * @param {number} fps
 * @param {'confetti' | 'burst'} effect
 */
async function replay(t, fps, effect) {
	const frames = await animate(
		t,
		effect,
		Array.from({ length: fps / 2 }, (_, i) => ((i + 1) * 1000) / fps)
	);
	return frames[frames.length - 1];
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

	for (const fps of [60, 120, 144]) {
		test(`${effect} moves every frame at ${fps} FPS with clock jitter`, async (t) => {
			const timestamps = Array.from(
				{ length: 30 },
				(_, i) => ((i + 1) * 1000) / fps + (i % 2 ? 0.4 : -0.4)
			);
			const frames = await animate(t, effect, timestamps);
			for (let i = 1; i < frames.length; i++) {
				assert.notEqual(frames[i][0].x, frames[i - 1][0].x, `frozen frame ${i}`);
				assert.notEqual(frames[i][0].y, frames[i - 1][0].y, `frozen frame ${i}`);
			}
		});
	}

	test(`${effect} caps a hidden-tab pause at 50 ms and resumes moving`, async (t) => {
		const paused = await animate(t, effect, [0, 10_000, 10_000 + 1000 / 60]);
		const capped = await animate(t, effect, [0, 50, 50 + 1000 / 60]);
		for (let frame = 0; frame < paused.length; frame++) {
			assert.equal(paused[frame].length, capped[frame].length);
			for (let i = 0; i < paused[frame].length; i++) {
				for (const axis of /** @type {const} */ (['x', 'y']))
					assert.ok(Math.abs(paused[frame][i][axis] - capped[frame][i][axis]) < 1e-9);
			}
		}
		assert.notEqual(paused[1][0].x, paused[0][0].x);
		assert.notEqual(paused[2][0].x, paused[1][0].x);
	});

	test(`${effect} ignores a first timestamp before the start clock`, async (t) => {
		const frames = await animate(t, effect, [99, 99, 1000], 100);
		assert.equal(frames[0][0].x, effect === 'confetti' ? -10 : 200);
		assert.equal(frames[0][0].y, effect === 'confetti' ? 680 : 400);
		assert.deepEqual(frames[0], frames[1]);
		assert.notEqual(frames[2][0].x, frames[1][0].x);
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

test('the canvas is shown only while particles are flying', async (t) => {
	t.mock.method(Math, 'random', () => 0.5);
	t.mock.method(performance, 'now', () => 0);
	/** @type {FrameRequestCallback | undefined} */
	let scheduled;
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
	const context = new Proxy({}, { get: () => () => {} });
	const canvas = /** @type {HTMLCanvasElement} */ (
		/** @type {unknown} */ ({ getContext: () => context, hidden: false })
	);
	const detach = particles.attachCanvas(canvas);
	try {
		assert.equal(canvas.hidden, true, 'hidden while nothing is flying');
		particles.burst(200, 400, ['#fff'], 2);
		assert.equal(canvas.hidden, false, 'shown once a burst starts');
		// Every particle lives at most one second, so a few frames of 50 ms each outlast them.
		for (let now = 50; now <= 1500 && scheduled; now += 50) {
			const callback = scheduled;
			scheduled = undefined;
			callback(now);
		}
		assert.equal(canvas.hidden, true, 'hidden again once the particles are gone');
		particles.burst(200, 400, ['#fff'], 2);
		assert.equal(canvas.hidden, false, 'shown again for the next burst');
	} finally {
		detach();
	}
});
