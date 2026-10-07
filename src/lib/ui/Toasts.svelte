<script>
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { dismiss, toasts } from '../state/toasts.svelte.js';
	import Icon from './Icon.svelte';
</script>

<div class="toasts" role="status" aria-live="polite">
	{#each toasts as t (t.id)}
		<button
			class="toast"
			animate:flip={{ duration: 200 }}
			in:fly={{ y: -40, duration: 380, easing: backOut }}
			out:fly={{ y: -30, duration: 200 }}
			onclick={() => dismiss(t.id)}
		>
			<span class="icon"><Icon name={t.icon} size={22} /></span>
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
	.toast {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		border-radius: 16px;
		border: 1px solid var(--surface-strong);
		background: var(--panel);
		color: var(--text);
		text-align: left;
		box-shadow: 0 12px 30px rgb(0 0 0 / 0.35);
		cursor: pointer;
	}
	.icon {
		display: grid;
		place-items: center;
		flex: none;
		width: 40px;
		height: 40px;
		border-radius: 12px;
		background: color-mix(in srgb, var(--accent), transparent 82%);
		color: var(--accent);
	}
	.text {
		display: grid;
	}
	small {
		color: var(--muted);
	}
</style>
