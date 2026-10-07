// Which screen and which dialog are showing.

/** @typedef {'home' | 'levels' | 'play' | 'shop' | 'trophies' | 'stats'} Screen */
/** @typedef {'' | 'settings' | 'howto' | 'gift' | 'zen'} Dialog */

export const nav = $state({
	/** @type {Screen} */
	screen: 'home',
	/** @type {Dialog} */
	dialog: ''
});

/** @param {Screen} screen */
export function go(screen) {
	nav.screen = screen;
	nav.dialog = '';
}
