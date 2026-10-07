<script>
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Crown from '@lucide/svelte/icons/crown';
	import Eye from '@lucide/svelte/icons/eye';
	import Lock from '@lucide/svelte/icons/lock';
	import Play from '@lucide/svelte/icons/play';
	import Star from '@lucide/svelte/icons/star';
	import {
		chapterName,
		chapterOf,
		LEVELS_PER_CHAPTER,
		levelSpec,
		NAMED_CHAPTERS
	} from '../game/levels.js';
	import { totalStars } from '../game/profile.js';
	import { sound } from '../fx/audio.js';
	import { go } from '../state/nav.svelte.js';
	import { profile } from '../state/profile.svelte.js';
	import { hasSave, startLevel } from '../state/session.svelte.js';
	import CoinChip from './CoinChip.svelte';

	const current = $derived(chapterOf(profile.unlocked));
	// Every named chapter is on the map from the start; past those, one chapter
	// ahead of the player. Levels only show for the current and next chapter.
	const chapters = $derived(
		Array.from({ length: Math.max(NAMED_CHAPTERS, current + 2) }, (_, c) => c)
	);

	/** @param {number} chapter */
	const levelsOf = (chapter) =>
		Array.from({ length: LEVELS_PER_CHAPTER }, (_, i) => chapter * LEVELS_PER_CHAPTER + i + 1);

	/** @param {number} chapter */
	const chapterStars = (chapter) =>
		levelsOf(chapter).reduce((sum, l) => sum + (profile.stars[l] ?? 0), 0);

	/** @param {number} level */
	function play(level) {
		sound.tap();
		startLevel(level);
		go('play');
	}

	/** @param {HTMLElement} node */
	function scrollToCurrent(node) {
		node.scrollIntoView({ block: 'center' });
	}
</script>

<section class="levels">
	<header>
		<button class="icon-button" aria-label="Back" onclick={() => go('home')}
			><ChevronLeft size={24} /></button
		>
		<h1>Levels</h1>
		<span class="total"><Star size={16} fill="currentColor" /> {totalStars(profile)}</span>
		<CoinChip />
	</header>

	<div class="scroll">
		{#each chapters as chapter (chapter)}
			{@const locked = chapter * LEVELS_PER_CHAPTER + 1 > profile.unlocked}
			<section class="chapter" class:locked style:--hue={(chapter * 47) % 360}>
				<div class="chapter-head">
					<div>
						<small>Chapter {chapter + 1}</small>
						<h2>{chapterName(chapter)}</h2>
					</div>
					{#if chapter > current + 1}
						<span class="later"
							><Lock size={14} /> Levels {chapter * LEVELS_PER_CHAPTER + 1}–{(chapter + 1) *
								LEVELS_PER_CHAPTER}</span
						>
					{:else}
						<span class="total"
							><Star size={14} fill="currentColor" />
							{chapterStars(chapter)}/{LEVELS_PER_CHAPTER * 3}</span
						>
					{/if}
				</div>
				{#if chapter <= current + 1}<div class="grid">
						{#each levelsOf(chapter) as level (level)}
							{@const spec = levelSpec(level)}
							{@const stars = profile.stars[level] ?? 0}
							{@const open = level <= profile.unlocked}
							{#if level === profile.unlocked}
								<button
									class="node current"
									class:boss={spec.boss}
									onclick={() => play(level)}
									use:scrollToCurrent
								>
									<b>{level}</b>
									<small
										>{#if hasSave((s) => s.mode === 'level' && s.level === level)}<Play
												size={12}
												fill="currentColor"
												aria-label="Continue"
											/>{:else if spec.boss}<Crown
												size={14}
												aria-label="Boss"
											/>{:else}Play{/if}</small
									>
								</button>
							{:else}
								<button
									class="node"
									class:boss={spec.boss}
									class:open
									disabled={!open}
									onclick={() => play(level)}
									aria-label="Level {level}{open ? `, ${stars} stars` : ', locked'}"
								>
									{#if open}
										<b>{level}</b>
										<span class="stars">
											{#each [1, 2, 3] as n (n)}<i class:lit={stars >= n}>★</i>{/each}
										</span>
									{:else}
										<Lock size={16} />
										<small>{level}</small>
									{/if}
									{#if spec.boss}<span class="crown boss-badge"><Crown size={12} /></span
										>{:else if spec.mystery}<span class="crown"><Eye size={12} /></span>{/if}
								</button>
							{/if}
						{/each}
					</div>{/if}
			</section>
		{/each}
	</div>
</section>

<style>
	.levels {
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
		grid-template-columns: auto 1fr auto auto;
		align-items: center;
		gap: 10px;
		padding: calc(10px + env(safe-area-inset-top)) 14px 10px;
	}
	h1 {
		margin: 0;
		font-family: var(--display);
	}
	.total {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-weight: 700;
	}
	.total :global(svg) {
		color: #ffcf3f;
	}
	.scroll {
		overflow-y: auto;
		padding: 0 14px calc(24px + env(safe-area-inset-bottom));
		display: grid;
		gap: 16px;
		align-content: start;
	}
	.chapter {
		padding: 14px;
		border-radius: 24px;
		background: linear-gradient(
			160deg,
			hsl(var(--hue) 80% 60% / 0.22),
			hsl(calc(var(--hue) + 60) 80% 50% / 0.08)
		);
		border: 1px solid var(--surface-strong);
	}
	.chapter.locked {
		opacity: 0.6;
	}
	.chapter-head {
		display: flex;
		justify-content: space-between;
		align-items: end;
		margin-bottom: 10px;
	}
	.later {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 13px;
		color: var(--muted);
	}
	.chapter:has(.later) .chapter-head {
		margin-bottom: 0;
	}
	.chapter-head small {
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-size: 11px;
	}
	h2 {
		margin: 0;
		font-family: var(--display);
		font-size: 22px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 10px;
	}
	.node {
		position: relative;
		display: grid;
		place-items: center;
		align-content: center;
		aspect-ratio: 1;
		padding: 0;
		border-radius: 50%;
		background: var(--surface);
		color: var(--muted);
		font-size: 18px;
	}
	.node.open {
		background: var(--surface-strong);
		color: var(--text);
	}
	.node b {
		line-height: 1;
	}
	.node.boss {
		border: 2px solid #ffcf3f;
	}
	.node.current {
		background: linear-gradient(135deg, var(--accent), var(--accent-2));
		color: #fff;
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent), transparent 60%);
		animation: pulse 1.4s ease-in-out infinite alternate;
	}
	.node.current small {
		font-size: 11px;
		font-weight: 700;
	}
	.stars {
		font-size: 10px;
		letter-spacing: -1px;
		font-style: normal;
	}
	.stars i {
		font-style: normal;
		color: var(--surface-strong);
	}
	.stars i.lit {
		color: #ffcf3f;
	}
	.crown {
		position: absolute;
		top: -6px;
		right: -4px;
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--surface-strong);
		color: var(--text);
	}
	.crown.boss-badge {
		background: #ffcf3f;
		color: #3a1d00;
	}
	@keyframes pulse {
		to {
			box-shadow: 0 0 0 9px color-mix(in srgb, var(--accent), transparent 85%);
		}
	}
</style>
