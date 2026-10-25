import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { completeNote, dropNote } from '../src/lib/fx/pitch.js';
import { pulses, schedule } from '../src/lib/fx/haptics.js';

const SPRITE = JSON.parse(
	readFileSync(new URL('../src/lib/fx/sfx-sprite.json', import.meta.url), 'utf8')
);
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
// MIDI note of a scale degree from C4, as scripts/sounds/effects.py renders the colors.
const degreeNote = (/** @type {number} */ d) => 60 + 12 * Math.floor(d / 7) + MAJOR[d % 7];
const spriteNote = (/** @type {string} */ name) => degreeNote(Number(name.replace('drop', '')));

test('each ball of a stack move lands a scale step above the last', () => {
	for (let c = 0; c < 14; c++) {
		for (let steps = 0; steps < 6; steps++) {
			const { name, cents } = dropNote(c, steps);
			assert.ok(name in SPRITE, name);
			assert.equal(spriteNote(name) + cents / 100, degreeNote(c + steps), `${c} + ${steps}`);
		}
	}
});

test('every combo step sounds higher than the one before, up to x10', () => {
	// complete1..7 are rendered a major-scale step apart (effects.py).
	const pitch = (/** @type {number} */ combo) => {
		const { name, cents } = completeNote(combo);
		assert.ok(name in SPRITE, name);
		const n = Number(name.replace('complete', ''));
		return MAJOR[n - 1] + cents / 100;
	};
	for (let combo = 2; combo <= 10; combo++) assert.ok(pitch(combo) > pitch(combo - 1), `x${combo}`);
	assert.equal(pitch(8), 12);
	assert.equal(pitch(10), 16);
	assert.equal(pitch(25), pitch(10));
	assert.equal(pitch(0), 0);
});

test('vibration pulses keep the run of notes in step', () => {
	assert.deepEqual(pulses(3, 10, 0.06), [10, 50, 10, 50, 10]);
	assert.deepEqual(pulses(1, 25, 0.07), [25]);
});

test('overlapping buzzes play as one pattern instead of canceling each other', () => {
	// A three-ball stack move at 230 ms whose completion run starts at 330 ms.
	const drops = [230, 290, 350].map((t) => /** @type {[number, number]} */ ([t, t + 10]));
	const run = [330, 400].map((t) => /** @type {[number, number]} */ ([t, t + 14]));
	assert.deepEqual(schedule([...drops, ...run], 0), [0, 230, 10, 50, 10, 30, 14, 6, 10, 40, 14]);
	// Rebuilt partway through: a buzz in progress keeps its remaining part.
	assert.deepEqual(schedule(drops, 235), [0, 0, 5, 50, 10, 50, 10]);
	// Touching or overlapping buzzes merge.
	assert.deepEqual(
		schedule(
			[
				[0, 10],
				[5, 20],
				[20, 30]
			],
			0
		),
		[0, 0, 30]
	);
});
