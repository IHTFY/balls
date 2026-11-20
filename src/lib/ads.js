// The ads on the result screen, the home screen, and beside the puzzle come from
// the shared IHTFY loader, which ihtfy.com serves for all the games (its source
// is in the IHTFY/com.ihtfy repo). Nothing ad-related loads before the player's
// first tap or key press: the loader arrives at the first game over or, on a
// screen wide enough for the ad beside the puzzle, at that first input, and
// AdSense after it at browser idle. A visitor who may have bought ad-free gets
// the loader at startup instead (loadForBuyer), so it can hide the ads before
// they show.
const LOADER = 'https://ihtfy.com/ads/v1.js';

// The shared 300×250 display unit.
export const RESULT_AD_SLOT = '6470163205';

// The sizes a result or home screen's ad may take, largest first: the first one
// that fits below the screen's content is used.
export const SCREEN_AD_SIZES = ['300x250', '320x100', '320x50'];

// What an ad aside (AdAside.svelte) takes beyond its box: the 25 px Privacy row and
// the 53 px between that row and the box, which keeps the box over 50 px from every
// link. The browser test checks this number against the real layout.
export const AD_ASIDE_EXTRA = 78;

/**
 * The largest screen ad size whose aside fits in `space` px and `across` px, or null when none does.
 * @param {number} space the height from the end of the content to the bottom of the screen
 * @param {number} [across] the width of the window
 */
export function fitAdSize(space, across = Infinity) {
	return (
		SCREEN_AD_SIZES.find((s) => {
			const [w, h] = s.split('x').map(Number);
			return AD_ASIDE_EXTRA + h <= space && w <= across;
		}) ?? null
	);
}

/**
 * Whether a screen may hold an ad box. The results screen does. The home screen
 * does once the player has finished a game in this tab, and only while nothing
 * floats over it. The play screen never does on a phone (the ad beside the
 * puzzle, PLAY_AD_SIZES, needs a window wider than any phone), and neither do
 * dialogs: the level map, shop, trophies, and stats scroll, so their ad would sit
 * below the fold; settings and help are dialogs. A visitor who bought ad-free
 * gets none, and neither does the results screen while the ad beside the puzzle
 * is on screen: one ad at a time.
 * @param {string} screen
 * @param {{ buyer: boolean, played: boolean, covered?: boolean, beside?: boolean }} state `covered`: a dialog or the gift button is over the screen; `beside`: the play ad is beside the puzzle
 */
export function adForScreen(screen, { buyer, played, covered = false, beside = false }) {
	if (buyer) return null;
	if (screen === 'results' && !beside) return { slot: RESULT_AD_SLOT };
	if (screen === 'home' && played && !covered) return { slot: RESULT_AD_SLOT };
	return null;
}

// The games-play unit: 300×600 in AdSense; the 160×600 box uses it too.
export const PLAY_AD_SLOT = '7239875855';

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

/**
 * Whether this visitor is a buyer once the shared loader has checked the token. It resolves
 * false at once with no token, and false when the loader says the token does not count. It
 * resolves true for a valid token, and also when the check cannot finish (the loader will
 * not load or throws), so the boxes stay collapsed rather than appear and stay empty.
 * @returns {Promise<boolean>}
 */
export function checkAdFree() {
	if (!mayBeAdFree()) return Promise.resolve(false);
	return load()
		.then(() => /** @type {any} */ (window).ihtfyAds.adFree())
		.then((free) => free !== false)
		.catch(() => true);
}

/** Loads the loader now if this browser holds an ad-free token, so it can hide every ad box. */
export function loadForBuyer() {
	if (mayBeAdFree()) load().catch(() => {});
}

const asked = new Set();

/** Forgets that `key` was asked for, once its box left the page without getting an ad. */
export const releaseAd = (/** @type {string} */ key) => asked.delete(key);

/** Whether an ad was already asked for under `key`, which the loader never fills a second box for. */
export const adAsked = (/** @type {string} */ key) => asked.has(key);

/**
 * Fills `box` with an ad for the game over named `key`; offline, on failure, or while it is
 * hidden it stays empty.
 * Resolves to whether the loader was asked to place the ad.
 * @param {HTMLElement} box
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export function showAd(box, key) {
	if (!navigator.onLine) return Promise.resolve(false);
	// A box that left the page meanwhile would hold the key and block its replacement, and one
	// hidden meanwhile (a phone turned on its side) waits until it shows again.
	return load().then(
		() => {
			if (!box.isConnected || box.getClientRects?.().length === 0) return false;
			asked.add(key);
			/** @type {any} */ (window).ihtfyAds.show(box, key);
			return true;
		},
		() => false
	);
}

// The player's first tap or key press. The ad beside the puzzle waits for it,
// so nothing ad-related loads with the page.
const firstInput = new Promise((resolve) => {
	for (const type of ['pointerdown', 'keydown'])
		addEventListener(type, resolve, { once: true, capture: true });
});

// The ad beside the puzzle changes when the player starts a game, but at most
// once a minute after the last one was placed, since a puzzle can take seconds.
// Its keys start with `play/`, apart from the result screen's.
let plays = 0;
let placed = '';
let placedAt = -Infinity;

/**
 * The key for the ad beside a game the player just started: a new one if the
 * last was placed a minute or more ago, or if `fresh` (a new ad size).
 */
export function playAdKey(fresh = false) {
	if (fresh || performance.now() - placedAt >= 60_000) plays++;
	return `play/${plays}`;
}

/**
 * Fills `box` with the ad beside the puzzle, once the player has tapped or
 * pressed a key, if the box is still on the page.
 * @param {HTMLElement} box
 * @param {string} key
 */
export function showPlayAd(box, key) {
	firstInput
		.then(() => box.isConnected && showAd(box, key))
		.then((ok) => {
			// The minute counts from the placement: a slow loader doesn't use it up,
			// and a box that left the page before the loader arrived never starts it.
			if (ok && key !== placed) {
				placed = key;
				placedAt = performance.now();
			}
		});
}
