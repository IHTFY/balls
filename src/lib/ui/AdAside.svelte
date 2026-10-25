<script>
	import { fitAdSize, showAd } from '../ads.js';

	/**
	 * One ad under the content above it: the Privacy link first, then the label, and
	 * the box last, so the box keeps over 50 px from every link (the loader adds
	 * "Remove ads" beside Privacy). It takes the largest size that fits on the
	 * screen below `above`, once, and none if no size fits. The box keeps its size
	 * whether or not an ad fills it.
	 * @type {{ above: HTMLElement | undefined, slot: string, adKey: string }}
	 */
	let { above, slot, adKey } = $props();

	let size = $state(/** @type {string | null} */ (null));
	/** @type {HTMLDivElement | undefined} */
	let box = $state();
	const [width, height] = $derived(size?.split('x') ?? []);

	// Measured once, as soon as the content above is in the page.
	let measured = false;
	$effect(() => {
		if (!above || measured) return;
		measured = true;
		// The grid gap between the content and the aside takes room too.
		const gap = parseFloat(getComputedStyle(above.parentElement ?? above).rowGap) || 0;
		size = fitAdSize(innerHeight - above.getBoundingClientRect().bottom - gap);
	});

	$effect(() => {
		if (box) showAd(box, adKey);
	});
</script>

{#if size}
	<aside class="ad">
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
