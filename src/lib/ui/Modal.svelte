<script>
	import { fade, scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import X from '@lucide/svelte/icons/x';

	/**
	 * @type {{ title?: string, label?: string, onclose?: () => void, wide?: boolean,
	 *   children: import('svelte').Snippet }}
	 */
	let { title = '', label = title, onclose, wide = false, children } = $props();

	/** @type {HTMLDivElement} */
	let panel;

	$effect(() => {
		const previous = /** @type {HTMLElement | null} */ (document.activeElement);
		/** @type {HTMLElement | null} */ (panel.querySelector('.primary, button'))?.focus({
			preventScroll: true
		});
		return () => previous?.focus?.({ preventScroll: true });
	});
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose?.()} />

<div class="backdrop" transition:fade={{ duration: 180 }}>
	<button class="dismiss" aria-label="Close" tabindex="-1" onclick={() => onclose?.()}></button>
	<div
		class="panel"
		class:wide
		role="dialog"
		aria-modal="true"
		aria-label={label}
		bind:this={panel}
		transition:scale={{ start: 0.85, duration: 260, easing: backOut }}
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
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: grid;
		place-items: center;
		padding: 16px;
		background: rgb(5 5 20 / 0.55);
		backdrop-filter: blur(6px);
	}
	.dismiss {
		position: absolute;
		inset: 0;
		background: none;
		border: none;
		cursor: default;
	}
	.panel {
		position: relative;
		width: min(420px, 100%);
		max-height: min(88dvh, 760px);
		overflow-y: auto;
		padding: 20px;
		border-radius: 24px;
		background: var(--panel);
		color: var(--text);
		box-shadow:
			0 30px 80px rgb(0 0 0 / 0.45),
			inset 0 1px 0 rgb(255 255 255 / 0.15);
		border: 1px solid var(--surface-strong);
	}
	.panel.wide {
		width: min(560px, 100%);
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}
	h2 {
		margin: 0;
		font-family: var(--display);
		font-size: 24px;
	}
</style>
