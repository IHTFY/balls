<script>
	import { fade } from 'svelte/transition';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import X from '@lucide/svelte/icons/x';

	/**
	 * @type {{ title?: string, label?: string, onclose?: () => void, wide?: boolean,
	 *   children: import('svelte').Snippet }}
	 */
	let { title = '', label = title, onclose, wide = false, children } = $props();

	/** @type {HTMLDivElement} */
	let panel;

	// On a phone the panel is a sheet that rises from the bottom edge and sinks back
	// the same way; on a wide screen it settles in the middle with a short fade.
	const sheet = matchMedia('(max-width: 599px)').matches;

	/**
	 * @param {Element} _node
	 * @param {{ leaving?: boolean }} options
	 */
	function rise(_node, { leaving = false } = {}) {
		return sheet
			? {
					duration: leaving ? 160 : 240,
					easing: leaving ? cubicIn : cubicOut,
					css: (/** @type {number} */ t, /** @type {number} */ u) =>
						`transform: translateY(${u * 100}%)`
				}
			: {
					duration: leaving ? 140 : 200,
					easing: leaving ? cubicIn : cubicOut,
					css: (/** @type {number} */ t, /** @type {number} */ u) =>
						`opacity: ${t}; transform: scale(${1 - u * 0.04})`
				};
	}

	$effect(() => {
		const previous = /** @type {HTMLElement | null} */ (document.activeElement);
		/** @type {HTMLElement | null} */ (panel.querySelector('.primary, button'))?.focus({
			preventScroll: true
		});
		return () => previous?.focus?.({ preventScroll: true });
	});
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose?.()} />

<div class="backdrop" class:sheet transition:fade={{ duration: 180 }}>
	<button class="dismiss" aria-label="Close" tabindex="-1" onclick={() => onclose?.()}></button>
	<div
		class="panel"
		class:wide
		role="dialog"
		aria-modal="true"
		aria-label={label}
		bind:this={panel}
		in:rise
		out:rise={{ leaving: true }}
	>
		{#if title}
			<header>
				<h2>{title}</h2>
				{#if onclose}
					<button class="icon-button" aria-label="Close" onclick={onclose}><X size={20} /></button>
				{/if}
			</header>
		{/if}
		{@render children()}
	</div>
</div>

<style>
	/* Stops short of the ad beside the puzzle (PlayAd sets the variable). */
	.backdrop {
		position: fixed;
		inset: 0 var(--play-ad-right, 0px) 0 0;
		z-index: 50;
		display: grid;
		place-items: center;
		padding: 16px;
		background: rgb(5 5 20 / 0.55);
		backdrop-filter: blur(6px);
	}
	.backdrop.sheet {
		place-items: end center;
		padding: 0;
	}
	.dismiss {
		position: absolute;
		inset: 0;
		background: none;
		border: none;
		cursor: default;
	}
	/* The same glass as the tubes, with the tube's lit rim along the top. */
	.panel {
		position: relative;
		width: min(420px, 100%);
		max-height: min(88dvh, 760px);
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 18px 18px 20px;
		border-radius: 28px;
		background: linear-gradient(180deg, rgb(255 255 255 / 0.08), transparent 120px), var(--panel);
		color: var(--text);
		border: 1.5px solid var(--pane-rim);
		border-top-color: var(--glass-rim);
		box-shadow:
			0 30px 80px rgb(0 0 0 / 0.45),
			inset 0 2px 0 rgb(255 255 255 / 0.14);
	}
	.panel.wide {
		width: min(560px, 100%);
	}
	.sheet .panel {
		width: min(520px, 100%);
		max-height: 90dvh;
		border-bottom: none;
		border-radius: 28px 28px 0 0;
		padding-bottom: calc(20px + env(safe-area-inset-bottom));
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 14px;
	}
	h2 {
		margin: 0;
		font-family: var(--display);
		font-size: 26px;
	}
</style>
