<script module>
	// The control that opened the first dialog, kept while one dialog replaces another so that
	// focus returns to it only when the last one closes.
	/** @type {HTMLElement | null} */
	let opener = null;
	let showing = 0;
</script>

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

	/**
	 * Keeps Tab and Shift+Tab moving among the dialog's own controls, since the page behind it is
	 * covered. Focus is moved here rather than left to the browser, which may skip buttons.
	 * @param {KeyboardEvent} e
	 */
	function onkeydown(e) {
		if (e.key === 'Escape') return onclose?.();
		// A dialog that is fading out is inert, and the one that replaced it owns the keys.
		if (e.key !== 'Tab' || panel.closest('[inert]')) return;
		const stops = /** @type {HTMLElement[]} */ ([
			...panel.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')
		]).filter((el) => el.tabIndex >= 0 && !el.hasAttribute('disabled') && el.offsetParent);
		e.preventDefault();
		if (!stops.length) return;
		const at = stops.findIndex((el) => el === document.activeElement);
		const step = e.shiftKey ? -1 : 1;
		const next =
			at < 0 ? (e.shiftKey ? stops.length - 1 : 0) : (at + step + stops.length) % stops.length;
		stops[next].focus();
	}

	$effect(() => {
		const active = /** @type {HTMLElement | null} */ (document.activeElement);
		// Opened from a dialog that is still showing, this one replaces it and keeps its opener.
		// One opened from the page while another fades out starts again from the control used.
		const replaces = active === document.body || active?.closest('[role="dialog"]');
		if (showing++ === 0 || !replaces) opener = active;
		/** @type {HTMLElement | null} */ (panel.querySelector('.primary, button'))?.focus({
			preventScroll: true
		});
		// Runs once this dialog has faded out, by which time one that replaced it has focus.
		return () => {
			if (--showing > 0) return;
			opener?.focus?.({ preventScroll: true });
			opener = null;
		};
	});
</script>

<svelte:window {onkeydown} />

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
