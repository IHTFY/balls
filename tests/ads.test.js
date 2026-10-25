import assert from 'node:assert/strict';
import { setMaxListeners } from 'node:events';
import { beforeEach, test } from 'node:test';

/** Script tags the module added, recorded instead of fetched. */
/** @type {(FakeNode & { src?: string })[]} */
let added;
/** @type {unknown[][]} */
let shown;
let online = true;
/** @type {Record<string, string>} */
let storage;
let cookie = '';
let cookieBlocked = false;
let storageBlocked = false;

let now = 0;

Object.defineProperty(globalThis, 'navigator', { get: () => ({ onLine: online }) });
Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => now } });
Object.defineProperty(globalThis, 'localStorage', {
	configurable: true,
	get: () => ({
		getItem: (/** @type {string} */ key) => {
			if (storageBlocked) throw new Error('SecurityError');
			return storage[key] ?? null;
		}
	})
});

/** A minimal page: the module only creates script tags and adds them to `head`. */
const body = new Set();
class FakeNode extends EventTarget {
	removed = false;
	get isConnected() {
		return body.has(this);
	}
	remove() {
		this.removed = true;
		body.delete(this);
	}
}
/** The window's events: the module waits for the player's first tap or key press. */
const events = new EventTarget();
// Each fresh copy of the module adds its own listeners.
setMaxListeners(Infinity, events);
const press = () => events.dispatchEvent(new Event('keydown'));
Object.assign(globalThis, {
	window: globalThis,
	addEventListener: events.addEventListener.bind(events),
	document: {
		get cookie() {
			if (cookieBlocked) throw new Error('SecurityError');
			return cookie;
		},
		createElement: () => new FakeNode(),
		head: { appendChild: (/** @type {FakeNode} */ el) => added.push(el) }
	}
});

const tick = () => new Promise((resolve) => setTimeout(resolve));
let fresh = 0;
/** A new copy of the module, so each test starts with no loader. */
const loadAds = () =>
	/** @type {Promise<typeof import('../src/lib/ads.js')>} */ (
		import(`../src/lib/ads.js?${fresh++}`)
	);
/** An ad box attached to the page. */
const box = () => {
	const el = new FakeNode();
	body.add(el);
	return /** @type {HTMLElement} */ (/** @type {unknown} */ (el));
};

beforeEach(() => {
	added = [];
	body.clear();
	shown = [];
	online = true;
	storage = {};
	cookie = '';
	cookieBlocked = false;
	storageBlocked = false;
	now = 0;
	Object.assign(globalThis, {
		ihtfyAds: { show: (/** @type {unknown[]} */ ...args) => shown.push(args) }
	});
});

test('the loader is added once, then gets each box', async () => {
	const { showAd } = await loadAds();
	const a = box();
	showAd(a, 'a');
	showAd(a, 'b');
	assert.equal(added.length, 1);
	assert.equal(added[0].src, 'https://ihtfy.com/ads/v1.js');
	added[0].dispatchEvent(new Event('load'));
	await tick();
	assert.deepEqual(shown, [
		[a, 'a'],
		[a, 'b']
	]);
});

test('nothing loads offline', async () => {
	online = false;
	const { showAd } = await loadAds();
	showAd(box(), 'a');
	assert.equal(added.length, 0);
});

test('a failed load stays quiet, and the next game over tries again', async () => {
	const { showAd } = await loadAds();
	showAd(box(), 'a');
	added[0].dispatchEvent(new Event('error'));
	await tick();
	assert.equal(shown.length, 0);
	assert.equal(added[0].removed, true);
	showAd(box(), 'b');
	assert.equal(added.length, 2);
});

test('a box removed before the loader arrives gets no ad, so its replacement can', async () => {
	const { showAd } = await loadAds();
	const a = box();
	const b = box();
	showAd(a, 'same');
	a.remove();
	showAd(b, 'same');
	added[0].dispatchEvent(new Event('load'));
	await tick();
	assert.deepEqual(shown, [[b, 'same']]);
});

test('startup loads nothing for a visitor without an ad-free token', async () => {
	const { loadForBuyer } = await loadAds();
	loadForBuyer();
	assert.equal(added.length, 0);
});

test('a stored ad-free token loads the loader at startup, and a game over reuses it', async () => {
	storage['ihtfy-ad-free'] = 'x.y.z';
	const { loadForBuyer, showAd } = await loadAds();
	loadForBuyer();
	assert.equal(added.length, 1);
	assert.equal(added[0].src, 'https://ihtfy.com/ads/v1.js');
	const a = box();
	showAd(a, 'a');
	assert.equal(added.length, 1);
	added[0].dispatchEvent(new Event('load'));
	await tick();
	assert.deepEqual(shown, [[a, 'a']]);
});

test('an ad-free cookie alone loads the loader at startup', async () => {
	cookie = 'a=1; ihtfy-ad-free=x.y.z';
	const { loadForBuyer } = await loadAds();
	loadForBuyer();
	assert.equal(added.length, 1);
});

test('a frame that cannot read cookies still starts', async () => {
	cookieBlocked = true;
	const { loadForBuyer } = await loadAds();
	assert.doesNotThrow(() => loadForBuyer());
	assert.equal(added.length, 0);
});

test('with storage off, the cookie still loads the loader at startup', async () => {
	storageBlocked = true;
	cookie = 'ihtfy-ad-free=x.y.z';
	const { loadForBuyer } = await loadAds();
	assert.doesNotThrow(() => loadForBuyer());
	assert.equal(added.length, 1);
});

test('a failed startup load is tried again at the next game over', async () => {
	storage['ihtfy-ad-free'] = 'x.y.z';
	const { loadForBuyer, showAd } = await loadAds();
	loadForBuyer();
	added[0].dispatchEvent(new Event('error'));
	await tick();
	showAd(box(), 'a');
	assert.equal(added.length, 2);
});

test('with storage and cookies both unreadable, startup loads nothing and does not throw', async () => {
	storageBlocked = true;
	cookieBlocked = true;
	const { loadForBuyer } = await loadAds();
	assert.doesNotThrow(() => loadForBuyer());
	assert.equal(added.length, 0);
});

test('mayBeAdFree finds a token in storage or a cookie', async () => {
	const { mayBeAdFree } = await loadAds();
	assert.equal(mayBeAdFree(), false);
	storage['ihtfy-ad-free'] = 'x.y.z';
	assert.equal(mayBeAdFree(), true);
	storage = {};
	cookie = 'ihtfy-ad-free=x.y.z';
	assert.equal(mayBeAdFree(), true);
});

test('the ad beside the puzzle loads nothing before the first tap or key press', async () => {
	const { playAdKey, showPlayAd } = await loadAds();
	const a = box();
	const key = playAdKey();
	showPlayAd(a, key);
	await tick();
	assert.equal(added.length, 0);
	press();
	await tick();
	assert.equal(added.length, 1);
	added[0].dispatchEvent(new Event('load'));
	await tick();
	assert.deepEqual(shown, [[a, 'play/1']]);
});

test('a box beside the puzzle that left the page before the first tap gets no ad', async () => {
	const { playAdKey, showPlayAd } = await loadAds();
	const a = box();
	showPlayAd(a, playAdKey());
	a.remove();
	press();
	await tick();
	assert.equal(added.length, 0);
});

/** Lets the loader arrive and the box be handed to it. */
const placeAll = async () => {
	added.at(-1)?.dispatchEvent(new Event('load'));
	await tick();
};

test('a game started within a minute of the last ad keeps its key; a later one or a new size gets a new key', async () => {
	const { playAdKey, showPlayAd } = await loadAds();
	assert.equal(playAdKey(), 'play/1');
	press();
	now = 5_000;
	showPlayAd(box(), 'play/1');
	await tick();
	await placeAll();
	now = 64_999;
	assert.equal(playAdKey(), 'play/1');
	now = 65_000;
	assert.equal(playAdKey(), 'play/2');
	assert.equal(playAdKey(true), 'play/3');
});

test('the minute counts from the placement, so a slow loader does not use it up', async () => {
	const { playAdKey, showPlayAd } = await loadAds();
	press();
	const a = box();
	showPlayAd(a, playAdKey());
	await tick();
	// Requested at 0, but the loader takes 90 s to arrive: nothing is placed yet.
	now = 90_000;
	assert.equal(playAdKey(), 'play/2');
	await placeAll();
	assert.deepEqual(shown, [[a, 'play/1']]);
	// Placed at 90 s: a game started 30 s later keeps the ad, one at 150 s gets a new one.
	now = 120_000;
	assert.equal(playAdKey(), 'play/2');
	now = 150_000;
	assert.equal(playAdKey(), 'play/3');
});

test('a box that left the page before the loader arrived never starts the minute', async () => {
	const { playAdKey, showPlayAd } = await loadAds();
	press();
	const a = box();
	showPlayAd(a, playAdKey());
	await tick();
	a.remove();
	now = 1_000;
	await placeAll();
	assert.equal(shown.length, 0);
	now = 2_000;
	assert.equal(playAdKey(), 'play/2');
});

test('showing the same key again in a new box does not restart the minute', async () => {
	const { playAdKey, showPlayAd } = await loadAds();
	press();
	showPlayAd(box(), playAdKey());
	await tick();
	await placeAll();
	now = 30_000;
	showPlayAd(box(), playAdKey());
	await tick();
	now = 60_000;
	assert.equal(playAdKey(), 'play/2');
});

test('only the results screen and, after a game, the home screen get a box', async () => {
	const { adForScreen, RESULT_AD_SLOT } = await loadAds();
	const state = { buyer: false, played: true };
	assert.deepEqual(adForScreen('results', state), { slot: RESULT_AD_SLOT });
	assert.deepEqual(adForScreen('home', state), { slot: RESULT_AD_SLOT });
	assert.equal(adForScreen('home', { ...state, played: false }), null);
	for (const screen of [
		'play',
		'levels',
		'shop',
		'trophies',
		'stats',
		'settings',
		'howto',
		'zen',
		'gift'
	])
		assert.equal(adForScreen(screen, state), null, screen);
});

test('the results screen gets no box while the play ad sits beside the puzzle', async () => {
	const { adForScreen } = await loadAds();
	assert.equal(adForScreen('results', { buyer: false, played: true, beside: true }), null);
});

test('the play screen never gets a box, whatever else is true', async () => {
	const { adForScreen } = await loadAds();
	for (const buyer of [false, true])
		for (const played of [false, true])
			for (const covered of [false, true])
				assert.equal(adForScreen('play', { buyer, played, covered }), null);
});

test('a buyer never gets a box', async () => {
	const { adForScreen } = await loadAds();
	for (const screen of ['results', 'home', 'play', 'levels'])
		assert.equal(adForScreen(screen, { buyer: true, played: true }), null, screen);
});

test('the home screen gets no box while the gift button or a dialog covers it', async () => {
	const { adForScreen } = await loadAds();
	assert.equal(adForScreen('home', { buyer: false, played: true, covered: true }), null);
});

test('a screen ad takes the largest size that fits and none when nothing does', async () => {
	const { AD_ASIDE_EXTRA, fitAdSize } = await loadAds();
	assert.equal(fitAdSize(AD_ASIDE_EXTRA + 250), '300x250');
	assert.equal(fitAdSize(AD_ASIDE_EXTRA + 249), '320x100');
	assert.equal(fitAdSize(AD_ASIDE_EXTRA + 100), '320x100');
	assert.equal(fitAdSize(AD_ASIDE_EXTRA + 99), '320x50');
	assert.equal(fitAdSize(AD_ASIDE_EXTRA + 50), '320x50');
	assert.equal(fitAdSize(AD_ASIDE_EXTRA + 49), null);
	assert.equal(fitAdSize(-20), null);
});

test('adAsked is true once a box was handed to the loader under that key', async () => {
	const { adAsked, showAd } = await loadAds();
	assert.equal(adAsked('home/1'), false);
	showAd(box(), 'home/1');
	assert.equal(adAsked('home/1'), false);
	await placeAll();
	assert.equal(adAsked('home/1'), true);
});
