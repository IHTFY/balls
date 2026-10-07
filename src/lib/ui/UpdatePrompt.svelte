<script>
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { slide } from 'svelte/transition';
	import { updates } from '../state/updates.svelte.js';
</script>

{#if updates.waiting && !updates.dismissed}
	<div class="update" role="status" transition:slide={{ duration: 300 }}>
		<span class="message"><Sparkles size={18} /> A new version is ready</span>
		<button class="later" onclick={() => (updates.dismissed = true)}>Later</button>
		<button class="primary" onclick={() => updates.apply()}>Update</button>
	</div>
{/if}

<style>
	.update {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 8px 8px 8px 16px;
		border-radius: 20px;
		background: var(--surface-strong);
		border: 1px solid var(--accent);
	}
	.message {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: 1;
		font-weight: 600;
	}
	.update button {
		min-height: 0;
		padding: 8px 14px;
	}
	.later {
		background: none;
		color: var(--muted);
	}
</style>
