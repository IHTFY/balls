// The player's saved progress, kept in local storage.
import { newlyEarned } from '../game/achievements.js';
import { dateKey, defaultProfile, sanitizeProfile, STORAGE_KEY } from '../game/profile.js';
import { notify } from './toasts.svelte.js';

/**
 * The profile as last read from or written to storage, so an unchanged one is not written again.
 * @type {string | null}
 */
let stored = null;
/** The save adopted ahead of its own event, until that event arrives. */
let early = /** @type {string | null} */ (null);

function load() {
	/** @type {string | null} */
	let raw = null;
	try {
		raw = stored = localStorage.getItem(STORAGE_KEY);
		return sanitizeProfile(raw ? JSON.parse(raw) : null);
	} catch {
		// Keep an unreadable save so it can be recovered by hand, then start fresh.
		try {
			if (raw) localStorage.setItem(`${STORAGE_KEY}.unreadable`, raw);
		} catch {
			/* Storage is blocked or full: play continues without saving. */
		}
		return defaultProfile();
	}
}

export const profile = $state(load());

/**
 * Writes the profile when it changed; the game keeps working when storage is full or blocked.
 * Skipping an unchanged profile keeps a copy left open in another tab from writing back an
 * older one when it is hidden or closed.
 */
export function persist() {
	const json = JSON.stringify(profile);
	if (json === stored) return;
	try {
		localStorage.setItem(STORAGE_KEY, json);
		stored = json;
		early = null;
	} catch {
		/* Progress lasts until the page closes. */
	}
}

// Another open copy of the game saved: take its profile, saved game included, so this copy's
// next write builds on it instead of replacing it. Storage events can arrive late, so the profile
// adopted is the one storage holds now, not the event's, and a late event is skipped when this
// copy already holds what storage does: an event for an older value, or the later event for a
// save already adopted early, would undo changes made since. An event for the value this copy
// holds, with none pending, is a reset to that same value, and applies.
window.addEventListener('storage', (event) => {
	if (event.key !== STORAGE_KEY || event.newValue === null) return;
	try {
		const current = localStorage.getItem(STORAGE_KEY);
		if (current === null) return;
		if (current === stored) {
			const pending = event.newValue === early;
			if (pending) early = null;
			if (pending || event.newValue !== current) return;
		}
		Object.assign(profile, sanitizeProfile(JSON.parse(current)));
		stored = current;
		early = event.newValue === current ? null : current;
	} catch {
		/* An unreadable save from the other copy: keep this one's. */
	}
});

/** @param {number} amount */
export function earn(amount) {
	profile.coins += amount;
	profile.stats.coinsEarned += amount;
}

/** @param {number} amount */
export function spend(amount) {
	if (profile.coins < amount) return false;
	profile.coins -= amount;
	return true;
}

/**
 * Awards any achievements the profile now meets and returns them. Each one is announced
 * unless `quiet`, for a screen that shows them itself.
 */
export function checkAchievements(quiet = false) {
	/** @type {ReturnType<typeof newlyEarned>} */
	const all = [];
	// Rewards can unlock further achievements (coins earned), so repeat until settled.
	for (let earned = newlyEarned(profile); earned.length; earned = newlyEarned(profile)) {
		for (const a of earned) {
			profile.achievements[a.id] = dateKey();
			earn(a.reward);
			all.push(a);
			if (!quiet)
				notify({ icon: a.icon, title: a.title, body: `Achievement unlocked · +${a.reward} coins` });
		}
	}
	return all;
}

export function resetProfile() {
	Object.assign(profile, defaultProfile());
	persist();
}
