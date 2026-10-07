// The build fills in VERSION and ASSETS (see vite.config.js). Every built file
// is precached on install, so the game loads and plays with no network at all.
/// <reference lib="webworker" />
const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

const VERSION = '__VERSION__';
/** @type {string[]} */
const ASSETS = [/* __ASSETS__ */];
const CACHE_PREFIX = `balls-${sw.registration.scope}-`;
const CACHE = `${CACHE_PREFIX}${VERSION}`;
const SHELL = new URL('./', sw.registration.scope).href;
const PRECACHED = new Set(ASSETS.map((a) => new URL(a, sw.registration.scope).href));

sw.addEventListener('install', (event) => {
	// No skipWaiting: the page asks the new worker to take over when the player
	// chooses Update, so files never change under a game in progress.
	event.waitUntil(
		caches
			.open(CACHE)
			// Bypass the HTTP cache so a new version never precaches stale files.
			.then((cache) => cache.addAll(ASSETS.map((a) => new Request(a, { cache: 'reload' }))))
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key.startsWith(CACHE_PREFIX) && key !== CACHE) await caches.delete(key);
			}
			await sw.clients.claim();
		})()
	);
});

sw.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') sw.skipWaiting();
	if (event.data?.type === 'VERSION') event.ports[0]?.postMessage(VERSION);
});

sw.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) return;
	url.search = '';
	url.hash = '';

	if (request.mode === 'navigate' && url.href.startsWith(sw.registration.scope)) {
		// Cache first: the shell only changes together with a new worker.
		event.respondWith(
			caches.match(SHELL, { cacheName: CACHE }).then((shell) => shell ?? fetch(request))
		);
		return;
	}
	if (PRECACHED.has(url.href)) {
		event.respondWith(
			caches.match(url.href, { cacheName: CACHE }).then((hit) => hit ?? fetch(request))
		);
	}
});
