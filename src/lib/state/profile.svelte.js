// The player's saved progress, kept in local storage.
import { newlyEarned } from '../game/achievements.js';
import {
	dateKey,
	defaultProfile,
	mergeProfiles,
	sanitizeProfile,
	STORAGE_KEY
} from '../game/profile.js';
import { notify } from './toasts.svelte.js';

/**
 * The save this copy last read from or wrote to storage. What the profile holds beyond it is this
 * copy's unsaved changes.
 * @type {string | null}
 */
let stored = null;
/**
 * Set when another open copy reset progress. This copy then saves nothing more and reloads to
 * start from the reset profile, as the copy that reset did, so a board or a result it still
 * shows cannot bring progress back.
 */
let retired = false;

/** @param {string | null} text */
function parse(text) {
	try {
		return sanitizeProfile(text ? JSON.parse(text) : null);
	} catch {
		return null;
	}
}

function load() {
	/** @type {string | null} */
	let raw = null;
	try {
		raw = stored = localStorage.getItem(STORAGE_KEY);
	} catch {
		/* Storage is blocked: play continues without saving. */
	}
	const loaded = parse(raw);
	if (loaded) return loaded;
	// Keep an unreadable save so it can be recovered by hand, then start fresh.
	try {
		if (raw) localStorage.setItem(`${STORAGE_KEY}.unreadable`, raw);
	} catch {
		/* Storage is blocked or full: play continues without saving. */
	}
	return defaultProfile();
}

export const profile = $state(load());

/**
 * Takes in what another open copy of the game saved since this one last read storage, saved game
 * included, and puts this copy's unsaved changes back on top, so the next write builds on both.
 * Storage is read directly because its events can arrive late or after this copy next saves; an
 * event only says when to look.
 */
function sync() {
	const current = localStorage.getItem(STORAGE_KEY);
	if (current === null || current === stored) return;
	const theirs = parse(current);
	// An unreadable save from the other copy: keep this one's.
	if (!theirs) return;
	if (theirs.resets > profile.resets) {
		retired = true;
		location.reload();
		return;
	}
	const base = parse(stored) ?? defaultProfile();
	Object.assign(profile, mergeProfiles(base, $state.snapshot(profile), theirs));
	stored = current;
}

/** Stores the profile unless storage already holds it. */
function write() {
	const json = JSON.stringify(profile);
	if (json === stored) return;
	localStorage.setItem(STORAGE_KEY, json);
	stored = json;
}

/**
 * Saves the profile on top of what any other open copy saved; the game keeps working when
 * storage is full or blocked. An unchanged profile is not written, which keeps a copy left open
 * in another tab from writing when it is hidden or closed.
 */
export function persist() {
	if (retired) return;
	try {
		sync();
		if (!retired) write();
	} catch {
		/* Progress lasts until the page closes. */
	}
}

window.addEventListener('storage', (event) => {
	if (event.key !== STORAGE_KEY || retired) return;
	try {
		sync();
	} catch {
		/* Storage is blocked: this copy keeps what it has. */
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

/** Starts over. The count of resets goes up, which is how other open copies know to start over too. */
export function resetProfile() {
	Object.assign(profile, defaultProfile(), { resets: profile.resets + 1 });
	try {
		write();
	} catch {
		/* The reset lasts until the page closes. */
	}
}
