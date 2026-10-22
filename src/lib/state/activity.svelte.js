// Tracks whether the player has been inactive, so decorative loops can pause.

/** Milliseconds without input before the app counts as idle. */
export const IDLE_AFTER = 15000;

export const activity = $state({ idle: false });

/** Listen for input and visibility changes; returns a cleanup function. */
export function watchActivity() {
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer;
	const wake = () => {
		activity.idle = false;
		clearTimeout(timer);
		timer = setTimeout(() => (activity.idle = true), IDLE_AFTER);
	};
	const onVisibility = () => {
		if (document.hidden) {
			clearTimeout(timer);
			activity.idle = true;
		} else wake();
	};
	const events = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'];
	for (const name of events) addEventListener(name, wake, { capture: true, passive: true });
	document.addEventListener('visibilitychange', onVisibility);
	onVisibility();
	return () => {
		clearTimeout(timer);
		for (const name of events) removeEventListener(name, wake, { capture: true });
		document.removeEventListener('visibilitychange', onVisibility);
	};
}
