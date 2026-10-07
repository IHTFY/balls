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
