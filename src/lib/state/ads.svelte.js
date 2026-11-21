// What decides where ads may go: whether the visitor counts as an ad-free buyer, and which
// size of ad fits beside the puzzle at the window's current size.
import { MediaQuery } from 'svelte/reactivity';
import { adFreeTokens, checkAdFree, PLAY_AD_SIZES } from '../ads.js';

/**
 * The shared loader's answer for each set of tokens it has checked: whether they count. Tokens
 * are asked about once, so a rejected token left in storage is never checked again, and an answer
 * that arrives late is filed under the tokens it was for, not the ones held by then. Each answer
 * makes a new list, so every screen that asked whether the visitor is a buyer asks again.
 * @type {[tokens: string, free: boolean][]}
 */
let answers = $state.raw([]);
const answerFor = (/** @type {string} */ held) => answers.find(([tokens]) => tokens === held)?.[1];
/** The tokens found by the last look, so an open screen asks again when a look finds others. */
let seen = $state(adFreeTokens());
/** The tokens whose check is running, and whether it was asked for again while it ran. */
let asking = '';
let again = false;

/**
 * Asks the loader about the tokens held now, unless it has answered for them. A check that cannot
 * finish (offline, or the loader will not load) leaves them unanswered for the next call, and
 * runs once more by itself when that call came while it was still on its way.
 */
function recheck() {
	const held = (seen = adFreeTokens());
	if (!held || answerFor(held) !== undefined) return;
	if (held === asking) {
		again = true;
		return;
	}
	// A check for other tokens that is still running may be waiting on the same load, which
	// can fail for both.
	again = asking !== '';
	asking = held;
	checkAdFree().then((answer) => {
		if (asking === held) asking = '';
		if (answer) answers = [...answers, [answer.tokens, answer.free]];
		// The tokens may have changed while the loader was on its way.
		if (answer || again) recheck();
	});
}

// At startup, when the tab returns or the window gets focus (a purchase in another tab or window
// arrives as a new token), and when the connection comes back (a check that could not finish can
// now).
recheck();
addEventListener('online', recheck);
addEventListener('focus', recheck);
document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'visible') recheck();
});

/**
 * Whether this visitor counts as an ad-free buyer: anyone holding tokens, read at each screen so
 * a purchase made in another tab counts, unless the shared loader said those tokens do not count.
 * No box is reserved while a check is pending or could not finish.
 */
export function isBuyer() {
	// Read so that a screen opened with other tokens, or none, asks again once a look finds these.
	void seen;
	const held = adFreeTokens();
	return held !== '' && answerFor(held) !== false;
}

const queries = PLAY_AD_SIZES.map((p) => new MediaQuery(p.query));

/** The ad beside the puzzle that fits the window now, if any; it follows the window's size. */
export const playPlacement = () => PLAY_AD_SIZES.find((_, i) => queries[i].current);
