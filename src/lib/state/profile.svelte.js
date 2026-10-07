// The player's saved progress, kept in local storage.
import { newlyEarned } from '../game/achievements.js';
import { dateKey, defaultProfile, sanitizeProfile, STORAGE_KEY } from '../game/profile.js';
import { notify } from './toasts.svelte.js';

function load() {
	/** @type {string | null} */
	let raw = null;
	try {
		raw = localStorage.getItem(STORAGE_KEY);
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

/** Writes the profile; the game keeps working when storage is full or blocked. */
export function persist() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
	} catch {
		/* Progress lasts until the page closes. */
	}
}

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

/** Awards any achievements the profile now meets and announces each one. */
export function checkAchievements() {
	// Rewards can unlock further achievements (coins earned), so repeat until settled.
	for (let earned = newlyEarned(profile); earned.length; earned = newlyEarned(profile)) {
		for (const a of earned) {
			profile.achievements[a.id] = dateKey();
			earn(a.reward);
			notify({ icon: a.icon, title: a.title, body: `Achievement unlocked · +${a.reward} coins` });
		}
	}
}

export function resetProfile() {
	Object.assign(profile, defaultProfile());
	persist();
}
