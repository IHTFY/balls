// The ads on the result screen and beside the puzzle come from the shared
// IHTFY loader, which ihtfy.com serves for all the games (its source is in the
// IHTFY/com.ihtfy repo). Nothing ad-related loads before the player's first tap
// or key press: the loader arrives at the first game over or, on a screen wide
// enough for the ad beside the puzzle, at that first input, and AdSense after
// it at browser idle. A visitor who may have bought ad-free gets the loader at
// startup instead (loadForBuyer), so it can hide the ads before they show.
const LOADER = 'https://ihtfy.com/ads/v1.js';

// The shared 300×250 display unit.
export const RESULT_AD_SLOT = '6470163205';

// The unit beside the puzzle. It shares the results unit until a unit of its
// own exists in AdSense.
export const PLAY_AD_SLOT = RESULT_AD_SLOT;

// The size of the ad beside the puzzle, by screen, first match wins. Each
// leaves the play area its full 1100 px plus 150 px to the ad and 16 px past
// it; other screens get no ad during play.
export const PLAY_AD_SIZES = [
	{ query: '(min-width: 1566px) and (min-height: 700px)', size: '300x600' },
	{ query: '(min-width: 1426px) and (min-height: 700px)', size: '160x600' }
];

/** @type {Promise<unknown> | null} */
let loader = null;

const load = () =>
	(loader ??= new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.async = true;
		script.src = LOADER;
		script.addEventListener('load', resolve);
		script.addEventListener('error', () => {
			script.remove();
			loader = null;
			reject(new Error('The ad loader did not load'));
		});
		document.head.appendChild(script);
	}));

/** Whether this browser holds an ad-free token, unchecked; the loader checks it. */
export function mayBeAdFree() {
	let found = false;
	try {
		found = !!localStorage.getItem('ihtfy-ad-free');
	} catch {
		// Storage off: the cookie may still hold the token.
	}
	try {
		found ||= /(?:^|;\s*)ihtfy-ad-free=/.test(document.cookie);
	} catch {
		// A sandboxed frame may not read cookies.
	}
	return found;
}

/** Loads the loader now if this browser holds an ad-free token, so it can hide every ad box. */
export function loadForBuyer() {
	if (mayBeAdFree()) load().catch(() => {});
}

/**
 * Fills `box` with an ad for the game over named `key`; offline or on failure it stays empty.
 * @param {HTMLElement} box
 * @param {string} key
 */
export function showAd(box, key) {
	if (!navigator.onLine) return;
	// A box that left the page meanwhile would hold the key and block its replacement.
	load().then(
		() => box.isConnected && /** @type {any} */ (window).ihtfyAds.show(box, key),
		() => {}
	);
}

// The player's first tap or key press. The ad beside the puzzle waits for it,
// so nothing ad-related loads with the page.
const firstInput = new Promise((resolve) => {
	for (const type of ['pointerdown', 'keydown'])
		addEventListener(type, resolve, { once: true, capture: true });
});

// The ad beside the puzzle changes when the player starts a game, but at most
// once a minute, since a puzzle can take seconds. Its keys start with `play/`,
// apart from the result screen's.
let plays = 0;
let requested = '';
let requestedAt = -Infinity;

/**
 * The key for the ad beside a game the player just started: a new one if the
 * last was requested a minute or more ago, or if `fresh` (a new ad size).
 */
export function playAdKey(fresh = false) {
	if (fresh || performance.now() - requestedAt >= 60_000) plays++;
	return `play/${plays}`;
}

/**
 * Fills `box` with the ad beside the puzzle, once the player has tapped or
 * pressed a key, if the box is still on the page.
 * @param {HTMLElement} box
 * @param {string} key
 */
export function showPlayAd(box, key) {
	firstInput.then(() => {
		if (!box.isConnected) return;
		if (key !== requested) {
			requested = key;
			requestedAt = performance.now();
		}
		showAd(box, key);
	});
}
