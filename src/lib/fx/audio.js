// Sounds and music are recordings of sampled instruments, rendered by scripts/sounds.
// The effects share one sprite file; sfx-sprite.json says where each one starts.
import SPRITE from './sfx-sprite.json';

/** Each file in Ogg Opus, with AAC for browsers that can't decode Opus. */
const FILES = {
	sfx: {
		ogg: new URL('../../assets/audio/sfx.ogg', import.meta.url).href,
		m4a: new URL('../../assets/audio/sfx.m4a', import.meta.url).href
	},
	menu: {
		ogg: new URL('../../assets/audio/music-menu.ogg', import.meta.url).href,
		m4a: new URL('../../assets/audio/music-menu.m4a', import.meta.url).href
	},
	play: {
		ogg: new URL('../../assets/audio/music-play.ogg', import.meta.url).href,
		m4a: new URL('../../assets/audio/music-play.m4a', import.meta.url).href
	}
};
/** @typedef {keyof typeof FILES} AudioFile */
/** @typedef {'menu' | 'play'} Scene */

const SFX_GAIN = 0.9;
// The loops are mastered to -20 LUFS; this keeps them well under the effects.
const MUSIC_GAIN = 0.4;
const FADE_OUT = 1.2;
const FADE_IN = 0.8;
// Each loop is exactly 32 bars (at 96 and 78 BPM), its tails already mixed into its
// start. Looping at the bar line keeps any padding a decoder adds out of the seam.
const LOOP_SECONDS = { menu: (32 * 4 * 60) / 96, play: (32 * 4 * 60) / 78 };

/** @type {AudioContext | null} */
let ctx = null;
/** @type {GainNode} */
let sfxBus;
/** @type {GainNode} */
let musicBus;
let sfxOn = true;
let musicOn = false;
/** @type {Scene} */
let scene = 'menu';

/** @type {Map<AudioFile, Promise<AudioBuffer | null>>} */
const buffers = new Map();
/** @type {AudioBuffer | null} */
let sfxBuffer = null;

function audio() {
	if (!ctx) {
		ctx = new AudioContext();
		// A safety net for many sounds at once; single sounds peak below its threshold.
		const limiter = ctx.createDynamicsCompressor();
		limiter.threshold.value = -3;
		limiter.knee.value = 0;
		limiter.ratio.value = 20;
		limiter.attack.value = 0.003;
		limiter.release.value = 0.1;
		limiter.connect(ctx.destination);
		sfxBus = ctx.createGain();
		sfxBus.gain.value = SFX_GAIN;
		sfxBus.connect(limiter);
		musicBus = ctx.createGain();
		musicBus.gain.value = MUSIC_GAIN;
		musicBus.connect(limiter);
	}
	// Resuming fails until the first user gesture; the next sound tries again.
	if (ctx.state === 'suspended') ctx.resume().catch(() => {});
	return ctx;
}

const prefersOpus = () =>
	typeof Audio !== 'undefined' && new Audio().canPlayType('audio/ogg; codecs="opus"') !== '';

/**
 * Downloads and decodes a file once. Some browsers claim Opus support and then
 * fail to decode it, so a failure falls back to AAC. Resolves null offline.
 * @param {AudioFile} name
 */
function load(name) {
	let pending = buffers.get(name);
	if (!pending) {
		const c = audio();
		/** @type {('ogg' | 'm4a')[]} */
		const formats = prefersOpus() ? ['ogg', 'm4a'] : ['m4a'];
		pending = (async () => {
			for (const format of formats) {
				try {
					const response = await fetch(FILES[name][format]);
					if (!response.ok) continue;
					return await c.decodeAudioData(await response.arrayBuffer());
				} catch {
					// Try the next format; with none left the sound stays silent.
				}
			}
			buffers.delete(name);
			return null;
		})();
		buffers.set(name, pending);
	}
	return pending;
}

/**
 * Plays one effect from the sprite.
 * @param {keyof typeof SPRITE} name
 * @param {number} [at] seconds from now
 */
function play(name, at = 0) {
	if (!sfxOn) return;
	const c = audio();
	if (!sfxBuffer) {
		// The first sounds after unlocking may beat the download; they are skipped.
		void load('sfx').then((b) => (sfxBuffer = b));
		return;
	}
	const [start, length] = SPRITE[name];
	const source = c.createBufferSource();
	source.buffer = sfxBuffer;
	source.connect(sfxBus);
	source.start(c.currentTime + at, start, length);
}

const COLORS = 14;
const color = (/** @type {number} */ c) => ((c % COLORS) + COLORS) % COLORS;

export const sound = {
	/** @param {number} c */
	pick: (c) => play(/** @type {keyof typeof SPRITE} */ (`pick${color(c)}`)),
	/** Index is the ball's position in a stack move. */
	drop: (/** @type {number} */ c, /** @type {number} */ index) =>
		play(/** @type {keyof typeof SPRITE} */ (`drop${color(c)}`), index * 0.06),
	invalid: () => play('invalid'),
	complete: (/** @type {number} */ combo) =>
		play(/** @type {keyof typeof SPRITE} */ (`complete${Math.min(Math.max(combo, 1), 7)}`)),
	win: () => play('win'),
	/** Plays for star number 1, 2, or 3. */
	star: (/** @type {number} */ n) =>
		play(/** @type {keyof typeof SPRITE} */ (`star${Math.min(Math.max(n, 1), 3)}`)),
	coin: () => play('coin'),
	tap: () => play('tap'),
	undo: () => play('undo'),
	hint: () => play('hint'),
	reveal: () => play('reveal'),
	buy: () => play('buy'),
	tick: () => play('tick'),
	whoosh: () => play('whoosh')
};

/** @param {boolean} on */
export function setSound(on) {
	sfxOn = on;
}

/** Wakes the audio context; browsers only allow this after a user gesture. */
export function unlockAudio() {
	if (!sfxOn && !musicOn) return;
	audio();
	if (sfxOn && !sfxBuffer) void load('sfx').then((b) => (sfxBuffer = b));
}

/** @type {{ scene: Scene, source: AudioBufferSourceNode, gain: GainNode } | null} */
let current = null;
/** Bumped on every change, so a slow download can't start an outdated loop. */
let generation = 0;

function stopCurrent() {
	if (!current || !ctx) return;
	const { source, gain } = current;
	gain.gain.setTargetAtTime(0, ctx.currentTime, FADE_OUT / 4);
	source.stop(ctx.currentTime + FADE_OUT);
	current = null;
}

async function startScene() {
	const want = ++generation;
	if (current?.scene === scene) return;
	const buffer = await load(scene);
	if (want !== generation || !musicOn || !buffer || current?.scene === scene) return;
	const c = audio();
	stopCurrent();
	const source = c.createBufferSource();
	source.buffer = buffer;
	source.loop = true;
	source.loopEnd = LOOP_SECONDS[scene];
	const gain = c.createGain();
	gain.gain.setValueAtTime(0, c.currentTime);
	gain.gain.linearRampToValueAtTime(1, c.currentTime + FADE_IN);
	source.connect(gain).connect(musicBus);
	source.start();
	current = { scene, source, gain };
}

/** @param {boolean} on */
export function setMusic(on) {
	musicOn = on;
	if (on) void startScene();
	else {
		generation++;
		stopCurrent();
	}
}

/**
 * Picks the loop for what's on screen: a bouncy one for the menus, a calmer
 * one while playing. Switching crossfades.
 * @param {Scene} next
 */
export function setMusicScene(next) {
	scene = next;
	if (musicOn) void startScene();
}

/** Silences everything while the app is hidden. */
export function suspendAudio(/** @type {boolean} */ hidden) {
	if (!ctx) return;
	// A failed suspend or resume leaves audio as it was, which is harmless.
	if (hidden) ctx.suspend().catch(() => {});
	else if (sfxOn || musicOn) ctx.resume().catch(() => {});
}
