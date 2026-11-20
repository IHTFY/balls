// What decides where ads may go: whether the visitor counts as an ad-free buyer, and which
// size of ad fits beside the puzzle at the window's current size.
import { MediaQuery } from 'svelte/reactivity';
import { checkAdFree, mayBeAdFree, PLAY_AD_SIZES } from '../ads.js';

/**
 * `buyer` holds for anyone with an ad-free token until the shared loader's check says the token
 * does not count, so no box is reserved while the check is pending.
 */
export const purchase = $state({ buyer: mayBeAdFree() });

if (purchase.buyer) checkAdFree().then((buyer) => (purchase.buyer = buyer));

const queries = PLAY_AD_SIZES.map((p) => new MediaQuery(p.query));

/** The ad beside the puzzle that fits the window now, if any; it follows the window's size. */
export const playPlacement = () => PLAY_AD_SIZES.find((_, i) => queries[i].current);
