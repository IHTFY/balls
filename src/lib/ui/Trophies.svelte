<script>
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Check from '@lucide/svelte/icons/check';
	import { ACHIEVEMENTS, earnedCount } from '../game/achievements.js';
	import { go } from '../state/nav.svelte.js';
	import { profile } from '../state/profile.svelte.js';
	import Coin from './Coin.svelte';
	import Icon from './Icon.svelte';

	const sorted = $derived(
		[...ACHIEVEMENTS].sort((a, b) => {
			const done = (/** @type {typeof a} */ x) => (profile.achievements[x.id] ? 1 : 0);
			const progress = (/** @type {typeof a} */ x) => Math.min(1, x.value(profile) / x.goal);
			return done(a) - done(b) || progress(b) - progress(a);
		})
	);
	const earned = $derived(earnedCount(profile));
</script>

<section class="trophies">
	<header>
		<button class="icon-button" aria-label="Back" onclick={() => go('home')}
			><ChevronLeft size={24} /></button
		>
		<h1>Trophies</h1>
		<span>{earned}/{ACHIEVEMENTS.length}</span>
	</header>
	<div class="scroll">
		<div class="pane rows">
			{#each sorted as a (a.id)}
				{@const done = !!profile.achievements[a.id]}
				{@const value = Math.min(a.value(profile), a.goal)}
				<div class="trophy" class:done>
					<span class="orb" class:empty={!done}><Icon name={a.icon} size={22} /></span>
					<div class="body">
						<b>{a.title}</b>
						<small>{a.description}</small>
						{#if done}
							<small class="when"><Check size={12} /> Unlocked {profile.achievements[a.id]}</small>
						{:else}
							<span class="progress">
								<span class="tube-bar"><span style:width="{(value / a.goal) * 100}%"></span></span>
								<small>{value.toLocaleString()} / {a.goal.toLocaleString()}</small>
							</span>
						{/if}
					</div>
					<span class="reward"><Coin size={16} /> {a.reward}</span>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.trophies {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-rows: auto 1fr;
		height: 100%;
		width: min(640px, 100%);
		margin: 0 auto;
	}
	header {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 10px;
		padding: calc(10px + env(safe-area-inset-top)) 14px 10px;
		font-weight: 700;
	}
	h1 {
		margin: 0;
		font-family: var(--display);
	}
	.scroll {
		overflow-y: auto;
		padding: 0 14px calc(24px + env(safe-area-inset-bottom));
	}
	.pane {
		padding: 0 14px;
	}
	.trophy {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 12px;
		padding: 12px 0;
	}
	.orb {
		--s: 46px;
		--c: var(--accent-2);
	}
	.body {
		display: grid;
		gap: 2px;
	}
	small {
		color: var(--muted);
	}
	.when {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		color: var(--accent);
	}
	.progress {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 8px;
		margin-top: 2px;
	}
	.tube-bar {
		height: 11px;
	}
	.trophy:not(.done) .reward {
		opacity: 0.6;
	}
	.reward {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-weight: 700;
		white-space: nowrap;
	}
</style>
