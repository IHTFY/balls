// Every sound is synthesized with Web Audio, so there are no files to download.

/** @type {AudioContext | null} */
let ctx = null;
/** @type {GainNode} */
let sfxBus;
/** @type {GainNode} */
let musicBus;
let sfxOn = true;
let musicOn = false;

/** C major pentatonic, so any mix of notes sounds pleasant. */
const PENTATONIC = [0, 2, 4, 7, 9];
const midiToHz = (/** @type {number} */ m) => 440 * 2 ** ((m - 69) / 12);
/** A note for a scale step, counting up from middle C. */
const step = (/** @type {number} */ n) =>
	midiToHz(60 + 12 * Math.floor(n / 5) + PENTATONIC[((n % 5) + 5) % 5]);

function audio() {
	if (!ctx) {
		ctx = new AudioContext();
		const limiter = ctx.createDynamicsCompressor();
		limiter.threshold.value = -10;
		limiter.connect(ctx.destination);
		sfxBus = ctx.createGain();
		sfxBus.gain.value = 0.55;
		sfxBus.connect(limiter);
		musicBus = ctx.createGain();
		musicBus.gain.value = 0;
		musicBus.connect(limiter);
	}
	// Resuming fails until the first user gesture; the next sound tries again.
	if (ctx.state === 'suspended') ctx.resume().catch(() => {});
	return ctx;
}

/**
 * @param {{ freq: number, type?: OscillatorType, gain?: number, attack?: number,
 *   decay?: number, at?: number, slide?: number, bus?: AudioNode }} o
 */
function tone({
	freq,
	type = 'sine',
	gain = 0.3,
	attack = 0.005,
	decay = 0.25,
	at = 0,
	slide,
	bus
}) {
	const c = audio();
	const t = c.currentTime + at;
	const osc = c.createOscillator();
	const amp = c.createGain();
	osc.type = type;
	osc.frequency.setValueAtTime(freq, t);
	if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + attack + decay);
	amp.gain.setValueAtTime(0.0001, t);
	amp.gain.exponentialRampToValueAtTime(gain, t + attack);
	amp.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
	osc.connect(amp).connect(bus ?? sfxBus);
	osc.start(t);
	osc.stop(t + attack + decay + 0.05);
}

/** A bell: a few inharmonic partials that ring out. */
function bell(/** @type {number} */ freq, at = 0, gain = 0.18, decay = 0.9) {
	tone({ freq, gain, decay, at });
	tone({ freq: freq * 2.76, gain: gain * 0.35, decay: decay * 0.5, at });
	tone({ freq: freq * 5.4, gain: gain * 0.15, decay: decay * 0.3, at });
}

/** A short filtered noise burst for clicks and clacks. */
function noise(/** @type {number} */ cutoff, gain = 0.2, decay = 0.06, at = 0) {
	const c = audio();
	const t = c.currentTime + at;
	const length = Math.ceil(c.sampleRate * (decay + 0.02));
	const buffer = c.createBuffer(1, length, c.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
	const src = c.createBufferSource();
	src.buffer = buffer;
	const filter = c.createBiquadFilter();
	filter.type = 'bandpass';
	filter.frequency.value = cutoff;
	const amp = c.createGain();
	amp.gain.value = gain;
	src.connect(filter).connect(amp).connect(sfxBus);
	src.start(t);
}

/**
 * Wraps a sound so it only plays while sound effects are on.
 * @template {unknown[]} A
 * @param {(...args: A) => void} play
 */
const sfx =
	(play) =>
	(/** @type {A} */ ...args) => {
		if (sfxOn) play(...args);
	};

export const sound = {
	/** @param {number} color */
	pick: sfx((/** @type {number} */ color) =>
		tone({
			freq: step(color + 5),
			type: 'triangle',
			gain: 0.22,
			decay: 0.12,
			slide: step(color + 7)
		})
	),
	/** Index is the ball's position in a stack move. */
	drop: sfx((/** @type {number} */ color, /** @type {number} */ index) => {
		const at = index * 0.06;
		tone({ freq: step(color + 3), type: 'sine', gain: 0.25, decay: 0.16, at });
		noise(1800, 0.25, 0.04, at + 0.12);
	}),
	invalid: sfx(() => {
		tone({ freq: 140, type: 'square', gain: 0.07, decay: 0.09 });
		tone({ freq: 110, type: 'square', gain: 0.07, decay: 0.12, at: 0.08 });
	}),
	complete: sfx((/** @type {number} */ combo) => {
		const root = 7 + Math.min(combo - 1, 6) * 2;
		[0, 2, 4, 7].forEach((n, i) => bell(step(root + n), i * 0.07, 0.14));
		if (combo > 1) tone({ freq: step(root + 9), gain: 0.1, decay: 0.6, at: 0.3, type: 'triangle' });
	}),
	win: sfx(() => {
		[0, 2, 4, 5, 7, 10].forEach((n, i) => bell(step(5 + n), i * 0.09, 0.16, 1.2));
		[0, 2, 4].forEach((n) =>
			tone({
				freq: step(5 + n) / 2,
				type: 'triangle',
				gain: 0.09,
				attack: 0.05,
				decay: 1.6,
				at: 0.55
			})
		);
	}),
	/** Plays for star number 1, 2, or 3. */
	star: sfx((/** @type {number} */ n) => bell(step(9 + n * 2), 0, 0.2, 0.8)),
	coin: sfx(() => {
		tone({ freq: 1976, type: 'square', gain: 0.05, decay: 0.08 });
		tone({ freq: 2637, type: 'square', gain: 0.05, decay: 0.25, at: 0.08 });
	}),
	tap: sfx(() => noise(3200, 0.12, 0.03)),
	undo: sfx(() => tone({ freq: 700, slide: 260, type: 'sine', gain: 0.14, decay: 0.16 })),
	hint: sfx(() => [0, 1, 2, 3, 4, 5].forEach((n) => bell(step(12 + n), n * 0.04, 0.06, 0.4))),
	reveal: sfx(() => bell(step(14), 0, 0.1, 0.5)),
	buy: sfx(() => {
		[0, 4, 7].forEach((n, i) => bell(step(10 + n), i * 0.06, 0.12));
		noise(5000, 0.15, 0.1, 0.18);
	}),
	tick: sfx(() => tone({ freq: 1200, type: 'square', gain: 0.04, decay: 0.03 })),
	whoosh: sfx(() => noise(900, 0.12, 0.22))
};

/** @param {boolean} on */
export function setSound(on) {
	sfxOn = on;
}

/** Wakes the audio context; browsers only allow this after a user gesture. */
export function unlockAudio() {
	if (sfxOn || musicOn) audio();
}

// Generative background music: soft pentatonic plucks over a slow chord loop.
const CHORDS = [
	[0, 2, 4],
	[-2, 0, 2],
	[-4, -2, 1],
	[-1, 1, 3]
];
const BEAT = 60 / 76 / 2;
/** @type {ReturnType<typeof setInterval> | null} */
let musicTimer = null;
let nextBeat = 0;
let beatIndex = 0;

function scheduleMusic() {
	const c = audio();
	if (!musicOn) return;
	while (nextBeat < c.currentTime + 0.4) {
		const chord = CHORDS[Math.floor(beatIndex / 16) % CHORDS.length];
		const at = Math.max(0, nextBeat - c.currentTime);
		if (beatIndex % 16 === 0) {
			tone({
				freq: step(chord[0] - 5) / 2,
				type: 'triangle',
				gain: 0.12,
				attack: 0.3,
				decay: 5,
				at,
				bus: musicBus
			});
		}
		if (beatIndex % 2 === 0 || Math.random() < 0.3) {
			if (Math.random() < 0.6) {
				const n = chord[Math.floor(Math.random() * 3)] + (Math.random() < 0.5 ? 5 : 10);
				tone({
					freq: step(n),
					type: 'sine',
					gain: 0.08,
					attack: 0.01,
					decay: 1.4,
					at,
					bus: musicBus
				});
				tone({
					freq: step(n) * 2,
					type: 'sine',
					gain: 0.015,
					attack: 0.01,
					decay: 0.8,
					at,
					bus: musicBus
				});
			}
		}
		nextBeat += BEAT;
		beatIndex++;
	}
}

/** @param {boolean} on */
export function setMusic(on) {
	musicOn = on;
	if (!on) {
		if (musicTimer) clearInterval(musicTimer);
		musicTimer = null;
		if (ctx) musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
		return;
	}
	const c = audio();
	if (musicTimer) return;
	musicBus.gain.setTargetAtTime(0.5, c.currentTime, 1);
	nextBeat = c.currentTime + 0.1;
	musicTimer = setInterval(scheduleMusic, 150);
}

/** Silences everything while the app is hidden. */
export function suspendAudio(/** @type {boolean} */ hidden) {
	if (!ctx) return;
	// A failed suspend or resume leaves audio as it was, which is harmless.
	if (hidden) ctx.suspend().catch(() => {});
	else if (sfxOn || musicOn) ctx.resume().catch(() => {});
}
