<script>
	import { profile } from '../state/profile.svelte.js';
	import RollingNumber from './RollingNumber.svelte';

	let bump = $state(0);
	let previous = profile.coins;
	$effect(() => {
		if (profile.coins > previous) bump++;
		previous = profile.coins;
	});
</script>

<div class="coins" aria-label="{profile.coins} coins">
	{#key bump}<span class="coin">🪙</span>{/key}
	<RollingNumber value={profile.coins} />
</div>

<style>
	.coins {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px 6px 8px;
		border-radius: 999px;
		background: var(--surface);
		font-weight: 700;
		font-size: 16px;
	}
	.coin {
		display: inline-block;
		animation: spin-coin 0.6s ease-out;
	}
	@keyframes spin-coin {
		from {
			transform: rotateY(0) scale(1.5);
		}
		to {
			transform: rotateY(720deg) scale(1);
		}
	}
</style>
