// What decides where ads may go: whether the visitor counts as an ad-free buyer, and which
// size of ad fits beside the puzzle at the window's current size.
import { MediaQuery } from 'svelte/reactivity';
import { checkAdFree, mayBeAdFree, PLAY_AD_SIZES } from '../ads.js';

/** Whether the shared loader's check said the stored token does not count. */
const verdict = $state({ rejected: false });

if (mayBeAdFree()) checkAdFree().then((buyer) => (verdict.rejected = !buyer));

/**
 * Whether this visitor counts as an ad-free buyer: anyone holding a token, read at each screen so
 * a purchase made in another tab counts, until the shared loader's check says the token does not
 * count. No box is reserved while that check is pending.
 */
export const isBuyer = () => mayBeAdFree() && !verdict.rejected;

const queries = PLAY_AD_SIZES.map((p) => new MediaQuery(p.query));

/** The ad beside the puzzle that fits the window now, if any; it follows the window's size. */
export const playPlacement = () => PLAY_AD_SIZES.find((_, i) => queries[i].current);
