<script>
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Lock from '@lucide/svelte/icons/lock';
	import { chapterName, chapterOf, LEVELS_PER_CHAPTER, levelSpec } from '../game/levels.js';
	import { totalStars } from '../game/profile.js';
	import { sound } from '../fx/audio.js';
	import { go } from '../state/nav.svelte.js';
	import { profile } from '../state/profile.svelte.js';
	import { hasSave, startLevel } from '../state/session.svelte.js';
	import CoinChip from './CoinChip.svelte';

	const lastChapter = $derived(chapterOf(profile.unlocked) + 1);
	const chapters = $derived(Array.from({ length: lastChapter + 1 }, (_, c) => c));

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
		<span class="total">⭐ {totalStars(profile)}</span>
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
					<span>⭐ {chapterStars(chapter)}/{LEVELS_PER_CHAPTER * 3}</span>
				</div>
				<div class="grid">
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
									>{hasSave((s) => s.mode === 'level' && s.level === level)
										? '▶'
										: spec.boss
											? '👑'
											: 'Play'}</small
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
								{#if spec.boss}<span class="crown">👑</span>{:else if spec.mystery}<span
										class="crown">🔮</span
									>{/if}
							</button>
						{/if}
					{/each}
				</div>
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
		font-weight: 700;
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
		font-size: 14px;
	}
	@keyframes pulse {
		to {
			box-shadow: 0 0 0 9px color-mix(in srgb, var(--accent), transparent 85%);
		}
	}
</style>
