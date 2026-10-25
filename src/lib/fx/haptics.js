// Short vibrations on devices that support them.
let enabled = true;

/** @param {boolean} on */
export function setHaptics(on) {
	enabled = on;
}

/** @param {number | number[]} pattern milliseconds */
export function buzz(pattern) {
	if (enabled && 'vibrate' in navigator) navigator.vibrate(pattern);
}

/**
 * A vibration pattern of evenly spaced pulses, to match a run of notes.
 * @param {number} count
 * @param {number} on milliseconds per pulse
 * @param {number} gap seconds from one pulse's start to the next
 */
export const pulses = (count, on, gap) =>
	Array.from({ length: count * 2 - 1 }, (_, i) => (i % 2 ? Math.round(gap * 1000) - on : on));
