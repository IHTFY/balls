import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeLayout } from '../src/lib/game/layout.js';

const sizes = [
	[320, 420],
	[390, 600],
	[600, 350],
	[1200, 700],
	[2400, 1300]
];

test('every tube and its lifted ball fit inside the board', () => {
	for (const [width, height] of sizes)
		for (const count of [3, 5, 9, 13, 16, 18])
			for (const capacity of [3, 4, 5]) {
				const l = computeLayout(count, capacity, width, height);
				assert.equal(l.tubes.length, count);
				for (const t of l.tubes) {
					const label = `${count}×${capacity} in ${width}×${height}`;
					assert.ok(t.x >= 0 && t.x + t.w <= width + 0.5, `${label} overflows sideways`);
					assert.ok(
						t.y - l.lift >= -0.5 && t.y + t.h <= height + 0.5,
						`${label} overflows vertically`
					);
				}
			}
});

test('tubes never overlap', () => {
	const l = computeLayout(16, 4, 390, 600);
	for (const a of l.tubes)
		for (const b of l.tubes) {
			if (a === b) continue;
			const apart =
				a.x + a.w <= b.x ||
				b.x + b.w <= a.x ||
				a.y + a.h <= b.y - l.lift ||
				b.y + b.h <= a.y - l.lift;
			assert.ok(apart);
		}
});

test('a narrow screen wraps a big board into rows', () => {
	assert.ok(computeLayout(16, 4, 390, 700).rows > 1);
	assert.equal(computeLayout(4, 4, 1200, 700).rows, 1);
});
