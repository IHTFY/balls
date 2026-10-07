<script>
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import { ACHIEVEMENTS } from '../game/achievements.js';
	import { go } from '../state/nav.svelte.js';
	import { profile } from '../state/profile.svelte.js';

	const sorted = $derived(
		[...ACHIEVEMENTS].sort((a, b) => {
			const done = (/** @type {typeof a} */ x) => (profile.achievements[x.id] ? 1 : 0);
			const progress = (/** @type {typeof a} */ x) => Math.min(1, x.value(profile) / x.goal);
			return done(a) - done(b) || progress(b) - progress(a);
		})
	);
	const earned = $derived(Object.keys(profile.achievements).length);
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
		{#each sorted as a (a.id)}
			{@const done = !!profile.achievements[a.id]}
			{@const value = Math.min(a.value(profile), a.goal)}
			<div class="trophy" class:done>
				<span class="icon">{a.icon}</span>
				<div class="body">
					<b>{a.title}</b>
					<small>{a.description}</small>
					{#if done}
						<small class="when">✓ Unlocked {profile.achievements[a.id]}</small>
					{:else}
						<div class="bar"><span style:width="{(value / a.goal) * 100}%"></span></div>
						<small>{value.toLocaleString()} / {a.goal.toLocaleString()}</small>
					{/if}
				</div>
				<span class="reward">🪙 {a.reward}</span>
			</div>
		{/each}
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
		display: grid;
		gap: 10px;
		align-content: start;
		padding: 0 14px calc(24px + env(safe-area-inset-bottom));
	}
	.trophy {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 12px;
		padding: 12px;
		border-radius: 18px;
		background: var(--surface);
	}
	.trophy:not(.done) .icon {
		filter: grayscale(1);
		opacity: 0.55;
	}
	.trophy.done {
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--accent), transparent 80%),
			var(--surface)
		);
	}
	.icon {
		font-size: 34px;
	}
	.body {
		display: grid;
		gap: 3px;
	}
	small {
		color: var(--muted);
	}
	.when {
		color: var(--accent);
	}
	.bar {
		height: 6px;
		border-radius: 999px;
		background: var(--surface-strong);
		overflow: hidden;
	}
	.bar span {
		display: block;
		height: 100%;
		background: linear-gradient(90deg, var(--accent-2), var(--accent));
	}
	.reward {
		font-weight: 700;
		white-space: nowrap;
	}
</style>
