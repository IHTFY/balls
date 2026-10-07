// Keeps installed copies current without a visit to the website: the app checks
// for a new version on launch, whenever it comes back to the foreground, when the
// connection returns, and hourly. A new version downloads in the background and
// applies when the player taps Update (or the next time the app starts from scratch).

export const updates = $state({
	/** @type {ServiceWorkerRegistration | null} */
	registration: null,
	/** @type {ServiceWorker | null} */
	waiting: null,
	dismissed: false,
	checking: false,
	version: '',
	/** @type {'' | 'current' | 'offline' | 'failed'} */
	lastCheck: '',

	async check() {
		if (!this.registration || this.checking) return;
		this.checking = true;
		try {
			await this.registration.update();
			this.lastCheck = 'current';
		} catch (error) {
			// Without a connection the check simply waits; anything else is a real failure.
			this.lastCheck = navigator.onLine ? 'failed' : 'offline';
			if (navigator.onLine) console.error('Update check failed:', error);
		} finally {
			this.checking = false;
		}
	},

	apply() {
		this.waiting?.postMessage({ type: 'SKIP_WAITING' });
	},

	/**
	 * Asks the active worker which build it serves.
	 * @param {ServiceWorkerRegistration} registration
	 */
	readVersion(registration) {
		const active = registration.active;
		if (!active) return;
		const channel = new MessageChannel();
		channel.port1.onmessage = ({ data }) => (this.version = String(data));
		active.postMessage({ type: 'VERSION' }, [channel.port2]);
	}
});

/** Registers the service worker and watches for new versions. */
export function registerServiceWorker() {
	if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
	const sw = navigator.serviceWorker;
	let controlled = !!sw.controller;
	let reloading = false;

	/** @param {ServiceWorkerRegistration} reg */
	function watch(reg) {
		if (reg.waiting && sw.controller) updates.waiting = reg.waiting;
		function watchInstalling() {
			const worker = reg.installing;
			worker?.addEventListener('statechange', () => {
				if (worker.state === 'installed' && sw.controller) updates.waiting = worker;
			});
		}
		reg.addEventListener('updatefound', watchInstalling);
		watchInstalling();
	}

	sw.addEventListener('controllerchange', () => {
		// The first install claims the page and needs no reload; later changes are updates.
		if (!controlled) {
			controlled = true;
			return;
		}
		if (reloading) return;
		reloading = true;
		location.reload();
	});

	const check = () => {
		if (document.visibilityState === 'visible') updates.check();
	};
	sw.register('./service-worker.js', { updateViaCache: 'none' }).then(
		(reg) => {
			updates.registration = reg;
			watch(reg);
			check();
		},
		(error) => console.warn('Offline play is unavailable:', error)
	);
	sw.ready.then((reg) => updates.readVersion(reg));
	document.addEventListener('visibilitychange', check);
	addEventListener('online', check);
	setInterval(check, 60 * 60 * 1000);
}
