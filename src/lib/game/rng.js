// Seeded randomness so a level number or date always produces the same puzzle.

/** @param {string} text */
export function hashString(text) {
	let h = 2166136261;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/**
 * Mulberry32: small, fast, and good enough for shuffling.
 * @param {number} seed
 * @returns {() => number} a function returning floats in [0, 1)
 */
export function createRng(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Fisher–Yates shuffle in place.
 * @template T
 * @param {T[]} items
 * @param {() => number} rng
 */
export function shuffleInPlace(items, rng) {
	for (let i = items.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[items[i], items[j]] = [items[j], items[i]];
	}
	return items;
}
