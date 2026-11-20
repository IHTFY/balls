// What decides where ads may go: whether the visitor counts as an ad-free buyer, and which
// size of ad fits beside the puzzle at the window's current size.
import { MediaQuery } from 'svelte/reactivity';
import { checkAdFree, mayBeAdFree, PLAY_AD_SIZES } from '../ads.js';

/**
 * `buyer` holds for anyone with an ad-free token until the shared loader's check says the token
 * does not count, so no box is reserved while the check is pending.
 */
export const purchase = $state({ buyer: mayBeAdFree() });

const verify = () => checkAdFree().then((buyer) => (purchase.buyer = buyer));
if (purchase.buyer) verify();

// A token bought in another tab arrives while this one is in the background, and a check that
// could not finish offline gets another try when the connection returns.
addEventListener('online', () => purchase.buyer && verify());
addEventListener('visibilitychange', () => {
	if (document.visibilityState !== 'visible' || purchase.buyer || !mayBeAdFree()) return;
	purchase.buyer = true;
	verify();
});

const queries = PLAY_AD_SIZES.map((p) => new MediaQuery(p.query));

/** The ad beside the puzzle that fits the window now, if any; it follows the window's size. */
export const playPlacement = () => PLAY_AD_SIZES.find((_, i) => queries[i].current);
