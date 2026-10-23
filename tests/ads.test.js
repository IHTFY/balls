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

test('a game started within a minute of the last ad keeps its key; a later one or a new size gets a new key', async () => {
	const { playAdKey, showPlayAd } = await loadAds();
	assert.equal(playAdKey(), 'play/1');
	press();
	now = 5_000;
	showPlayAd(box(), 'play/1');
	await tick();
	now = 64_999;
	assert.equal(playAdKey(), 'play/1');
	now = 65_000;
	assert.equal(playAdKey(), 'play/2');
	assert.equal(playAdKey(true), 'play/3');
});

test('showing the same key again in a new box does not restart the minute', async () => {
	const { playAdKey, showPlayAd } = await loadAds();
	press();
	showPlayAd(box(), playAdKey());
	await tick();
	now = 30_000;
	showPlayAd(box(), playAdKey());
	await tick();
	now = 60_000;
	assert.equal(playAdKey(), 'play/2');
});
