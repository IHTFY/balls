import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { KEYS, ballNote, completeNote } from '../src/lib/fx/pitch.js';
import { pulses, schedule } from '../src/lib/fx/haptics.js';

const SPRITE = JSON.parse(
	readFileSync(new URL('../src/lib/fx/sfx-sprite.json', import.meta.url), 'utf8')
);
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
/** @param {number[]} scale @param {number} step */
const degree = (scale, step) => 12 * Math.floor(step / 7) + scale[((step % 7) + 7) % 7];
// The songs' keys (scripts/sounds/songs.py): MIDI note of the tonic in octave 4, and scale.
const SONGS = /** @type {const} */ ({
	menu: [65, MAJOR],
	play: [62, MAJOR],
	blitz: [57, MINOR]
});
// Where effects.py renders each sprite note: picks and drops up C major from C4,
// completions as arpeggios with roots up C major from C5.
/** @param {{ name: string, cents: number }} note @param {number} keyCents */
function pitch({ name, cents }, keyCents) {
	assert.ok(name in SPRITE, name);
	const n = Number(name.replace(/^\D+/, ''));
	const base = name.startsWith('complete') || name.startsWith('chime') ? 72 : 60;
	return base + degree(MAJOR, n) + (cents + keyCents) / 100;
}

test('picks and drops play the step of the music’s scale they are given', () => {
	for (const [scene, [tonic, scale]] of Object.entries(SONGS)) {
		const key = KEYS[/** @type {keyof typeof KEYS} */ (scene)];
		for (let step = 0; step < 20; step++) {
			for (const kind of /** @type {const} */ (['pick', 'drop'])) {
				const note = ballNote(kind, key.tonic + step);
				assert.equal(
					pitch(note, key.cents),
					tonic + degree(scale, step),
					`${scene} ${kind} ${step}`
				);
			}
		}
	}
});

test('combos climb the music’s scale a step each, from its tonic, up to x10', () => {
	for (const [scene, [tonic, scale]] of Object.entries(SONGS)) {
		const key = KEYS[/** @type {keyof typeof KEYS} */ (scene)];
		const root = (/** @type {number} */ combo) => {
			const note = completeNote(combo, key.tonic);
			assert.equal(
				pitch({ name: note.chime, cents: note.cents }, key.cents),
				pitch(note, key.cents)
			);
			return pitch(note, key.cents);
		};
		for (let combo = 1; combo <= 10; combo++)
			assert.equal(root(combo), tonic + 12 + degree(scale, combo - 1), `${scene} x${combo}`);
		assert.equal(root(25), root(10));
		assert.equal(root(0), root(1));
	}
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
