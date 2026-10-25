// Short vibrations on devices that support them.
let enabled = true;

/** @param {boolean} on */
export function setHaptics(on) {
	enabled = on;
}

/** Buzzes still to come, as [start, end] on the performance.now() clock. */
/** @type {[number, number][]} */
let upcoming = [];

/**
 * Turns buzzes into one vibration pattern starting at now, merging any that overlap.
 * Starting a vibration cancels the one playing, so every buzz still to come goes in.
 * @param {[number, number][]} buzzes
 * @param {number} now
 */
export function schedule(buzzes, now) {
	const pattern = [0];
	let at = now;
	for (const [start, end] of [...buzzes].sort((a, b) => a[0] - b[0])) {
		if (end <= at) continue;
		const from = Math.max(start, at);
		if (from === at && pattern.length > 1) pattern[pattern.length - 1] += end - at;
		else pattern.push(from - at, end - from);
		at = end;
	}
	return pattern;
}

/**
 * @param {number | number[]} pattern milliseconds, buzzing and pausing in turn
 * @param {number} [delay] milliseconds from now
 */
export function buzz(pattern, delay = 0) {
	if (!enabled || !('vibrate' in navigator)) return;
	const now = Math.round(performance.now());
	let at = now + delay;
	[pattern].flat().forEach((ms, i) => {
		if (i % 2 === 0) upcoming.push([at, at + ms]);
		at += ms;
	});
	upcoming = upcoming.filter(([, end]) => end > now);
	navigator.vibrate(schedule(upcoming, now));
}

/**
 * A vibration pattern of evenly spaced pulses, to match a run of notes.
 * @param {number} count
 * @param {number} on milliseconds per pulse
 * @param {number} gap seconds from one pulse's start to the next
 */
export const pulses = (count, on, gap) =>
	Array.from({ length: count * 2 - 1 }, (_, i) => (i % 2 ? Math.round(gap * 1000) - on : on));
