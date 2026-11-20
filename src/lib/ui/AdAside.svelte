<script>
	import { AD_ASIDE_EXTRA, fitAdSize, releaseAd, showAd } from '../ads.js';

	/**
	 * One ad under the content above it: the Privacy link first, then the label, and
	 * the box last, so the box keeps over 50 px from every link (the loader adds
	 * "Remove ads" beside Privacy). It takes the largest size that fits on the screen
	 * below `above`, and none if no size fits; a window that later has room for one
	 * gets the first that fits. The box keeps its size whether or not an ad fills it.
	 * When the window changes (a phone turned on its side) and the box no longer fits
	 * in the first screen or the window's width, the aside is hidden, with its ad kept
	 * and no new one asked for, and it shows again where it fits.
	 * @type {{ above: HTMLElement | undefined, slot: string, adKey: string }}
	 */
	let { above, slot, adKey } = $props();

	let size = $state(/** @type {string | null} */ (null));
	/** @type {HTMLDivElement | undefined} */
	let box = $state();
	const [width, height] = $derived(size?.split('x') ?? []);

	let fits = $state(true);

	/** The height from the end of the content to the bottom of the screen, as if scrolled to the top. */
	function room() {
		const content = /** @type {HTMLElement} */ (above);
		let scrolled = 0;
		for (let el = content.parentElement; el; el = el.parentElement) scrolled += el.scrollTop;
		// The grid gap between the content and the aside takes room too.
		const gap = parseFloat(getComputedStyle(content.parentElement ?? content).rowGap) || 0;
		return innerHeight - (content.getBoundingClientRect().bottom + scrolled) - gap;
	}

	/** The width of the column the aside sits in, which a fixed-width box must not pass. */
	function across() {
		const column = /** @type {HTMLElement} */ (above).parentElement ?? document.body;
		const style = getComputedStyle(column);
		return column.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
	}

	// Measured as soon as the content above is in the page; the size is chosen then and stays.
	let measured = false;
	$effect(() => {
		if (!above || measured) return;
		measured = true;
		size = fitAdSize(room(), across());
	});

	function onresize() {
		if (!above) return;
		// No size fit at first (a phone on its side): the first one that fits now is taken.
		if (!size) size = fitAdSize(room(), across());
		else fits = AD_ASIDE_EXTRA + Number(height) <= room() && Number(width) <= across();
	}

	// A hidden box asks nothing; it asks when the window lets it show again, unless it asked
	// before: the ad it got stays in the box.
	let requested = false;
	$effect(() => {
		if (!box || !fits || requested) return;
		requested = true;
		showAd(box, adKey).then((placed) => (requested = placed));
	});

	// A box that leaves the page empty (the window widened into the side rail while the ad was
	// loading) lets its key go, so the same screen can ask again when it comes back.
	$effect(() => {
		const el = box;
		const key = adKey;
		return () => {
			if (el && !el.hasChildNodes()) releaseAd(key);
		};
	});
</script>

<svelte:window {onresize} />

{#if size}
	<aside class="ad" class:away={!fits}>
		<a href="https://ihtfy.com/privacy/" target="_blank" rel="noopener">Privacy</a>
		<small>Advertisements</small>
		<div
			class="ad-box"
			bind:this={box}
			style:width="{width}px"
			style:height="{height}px"
			data-ad-slot={slot}
			data-ad-size={size}
		></div>
	</aside>
{/if}

<style>
	.ad.away {
		display: none;
	}
	.ad {
		display: grid;
		justify-items: center;
		color: var(--muted);
		font-size: 12px;
	}
	/* Inline, so the loader's "Remove ads" link sits beside this one in one row. */
	.ad a {
		display: inline-block;
		padding: 4px 8px;
		line-height: 17px;
		color: inherit;
	}
	/* 32 + 17 + 4 puts the box 53 px below the link. */
	.ad small {
		margin: 32px 0 4px;
		line-height: 17px;
	}
</style>
