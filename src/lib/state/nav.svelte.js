// Which screen and which dialog are showing.

/** @typedef {'home' | 'levels' | 'play' | 'shop' | 'trophies' | 'stats'} Screen */
/** @typedef {'' | 'settings' | 'howto' | 'gift' | 'zen'} Dialog */

export const nav = $state({
	/** @type {Screen} */
	screen: 'home',
	/** @type {Dialog} */
	dialog: '',
	/** @type {Screen} the screen before this one, where Back from a puzzle returns */
	previous: 'home'
});

/** @param {Screen} screen */
export function go(screen) {
	nav.previous = nav.screen;
	nav.screen = screen;
	nav.dialog = '';
}

/**
 * One step back, as the phone's back button: close the dialog, leave a puzzle
 * for the level map it came from, or return home.
 */
export function back() {
	if (nav.dialog) nav.dialog = '';
	else if (nav.screen === 'play' && nav.previous === 'levels') go('levels');
	else go('home');
}
