<script>
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { dismiss, toasts } from '../state/toasts.svelte.js';
	import Icon from './Icon.svelte';
</script>

<div class="toasts" role="status" aria-live="polite">
	<!-- Three at most, so the stack never reaches the ad on the results screen. -->
	{#each toasts.slice(0, 3) as t (t.id)}
		<button
			class="toast"
			animate:flip={{ duration: 200 }}
			in:fly={{ y: -40, duration: 260, easing: cubicOut }}
			out:fly={{ y: -30, duration: 200 }}
			onclick={() => dismiss(t.id)}
		>
			<span class="orb"><Icon name={t.icon} size={20} /></span>
			<span class="text">
				<strong>{t.title}</strong>
				{#if t.body}<small>{t.body}</small>{/if}
			</span>
		</button>
	{/each}
</div>

<style>
	.toasts {
		position: fixed;
		top: calc(8px + env(safe-area-inset-top));
		left: 50%;
		transform: translateX(-50%);
		z-index: 80;
		display: grid;
		gap: 8px;
		width: min(360px, calc(100% - 24px));
		pointer-events: none;
	}
	/* The same glass as every pane, with a ball for the icon. */
	.toast {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 16px 8px 8px;
		border-radius: 999px;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.08), transparent 50%),
			color-mix(in srgb, var(--panel), transparent 6%);
		border: 1.5px solid var(--pane-rim);
		color: var(--text);
		text-align: left;
		box-shadow:
			inset 0 1.5px 0 rgb(255 255 255 / 0.12),
			0 12px 30px rgb(0 0 0 / 0.35);
		backdrop-filter: blur(10px);
		cursor: pointer;
	}
	.orb {
		--s: 40px;
	}
	.text {
		display: grid;
	}
	small {
		color: var(--muted);
	}
</style>
