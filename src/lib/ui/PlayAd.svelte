<script>
	import { MediaQuery } from 'svelte/reactivity';
	import { PLAY_AD_SIZES, PLAY_AD_SLOT, mayBeAdFree, playAdKey, showPlayAd } from '../ads.js';
	import { session } from '../state/session.svelte.js';

	/**
	 * The play screen with one ad beside it on wide screens, 150 px from its
	 * controls. The ad changes when the player starts a game, at most once a
	 * minute, or when the window crosses into another size; never on a timer.
	 * @type {{ children: import('svelte').Snippet }}
	 */
	let { children } = $props();

	// A buyer gets no box at all, even before the loader has checked the token.
	const buyer = mayBeAdFree();
	const queries = PLAY_AD_SIZES.map((p) => new MediaQuery(p.query));
	const placement = $derived(buyer ? undefined : PLAY_AD_SIZES.find((_, i) => queries[i].current));
	const [width, height] = $derived(placement?.size.split('x') ?? []);

	let key = $state('');
	/** @type {string | null | undefined} the size the last key was for; null before the first */
	let keyedSize = null;
	// A key when the screen opens, when a result closes for a new game, and for each new size.
	$effect.pre(() => {
		const playing = !session.result;
		const size = placement?.size;
		const resized = keyedSize !== null && size !== keyedSize;
		if (size && (playing || resized || keyedSize === null)) key = playAdKey(resized);
		keyedSize = size;
	});

	// Dialogs and the particle layer stop 150 px short of the ad, so nothing
	// covers it or crowds it with buttons.
	/** @type {HTMLElement | undefined} */
	let aside = $state();
	/** @type {HTMLDivElement | undefined} */
	let box = $state();
	$effect(() => {
		if (!aside || !box) return;
		const root = document.documentElement;
		const ad = box;
		const track = () => {
			// The loader hides the aside once it confirms an ad-free purchase.
			if (!ad.getClientRects().length) return root.style.removeProperty('--play-ad-right');
			const px = root.clientWidth - ad.getBoundingClientRect().left + 150;
			root.style.setProperty('--play-ad-right', `${Math.round(px)}px`);
		};
		const observer = new ResizeObserver(track);
		observer.observe(aside);
		addEventListener('resize', track);
		return () => {
			observer.disconnect();
			removeEventListener('resize', track);
			root.style.removeProperty('--play-ad-right');
		};
	});

	$effect(() => {
		if (box) showPlayAd(box, key);
	});
</script>

<div class="frame" class:side={placement}>
	<div class="area">{@render children()}</div>
	{#if placement}
		{#key key}
			<aside class="ad" bind:this={aside}>
				<div class="row">
					<small>Advertisements</small>
					<a href="https://ihtfy.com/privacy" target="_blank" rel="noopener">Privacy</a>
				</div>
				<div
					class="ad-box"
					bind:this={box}
					style:width="{width}px"
					style:height="{height}px"
					data-ad-slot={PLAY_AD_SLOT}
					data-ad-size={placement.size}
				></div>
			</aside>
		{/key}
	{/if}
</div>

<style>
	.frame,
	.area {
		height: 100%;
	}
	/* The play area keeps its full width; the ad sits 150 px past it. The
	   min-height keeps the screen's size if AdSense sets height: auto on the ad's
	   ancestors. */
	.frame.side {
		min-height: 100%;
		display: grid;
		grid-template: minmax(0, 1fr) / minmax(0, 1100px) auto;
		justify-content: center;
	}
	/* The column is as wide as the ad; the label and link wrap above it on a narrow one. */
	.ad {
		display: grid;
		grid-template-columns: min-content;
		align-content: start;
		gap: 6px;
		/* The play area's controls sit 12 px inside it, so they stay over 150 px away. */
		margin-left: 150px;
		padding: 8px 16px 0 0;
		color: var(--muted);
		font-size: 12px;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		column-gap: 12px;
	}
	.row a {
		color: inherit;
	}
</style>
