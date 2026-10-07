// Time formats shown in the game.

/** Minutes and seconds, like 2:05. */
export const clock = (/** @type {number} */ seconds) =>
	`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Hours and minutes, or minutes and seconds under an hour, like 1h 4m or 3m 12s. */
export function duration(/** @type {number} */ seconds) {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	return h ? `${h}h ${m}m` : `${m}m ${seconds % 60}s`;
}
