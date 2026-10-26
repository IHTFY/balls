<script>
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import { duration } from '../game/format.js';
	import { dateKey, totalStars } from '../game/profile.js';
	import { rankFor } from '../game/scoring.js';
	import { go } from '../state/nav.svelte.js';
	import { profile } from '../state/profile.svelte.js';
	import Icon from './Icon.svelte';

	const s = $derived(profile.stats);
	const rank = $derived(rankFor(profile.score));

	/** @type {[import('./icons.js').IconName, string, string | number][]} */
	const tiles = $derived([
		['map', 'Levels cleared', profile.unlocked - 1],
		['star', 'Stars', totalStars(profile)],
		['gem', 'Three-star clears', s.perfect],
		['puzzle', 'Puzzles solved', s.solved],
		['flag', 'Under par', s.underPar],
		['snowflake', 'Flawless', s.flawless],
		['mouse-pointer-click', 'Moves made', s.moves.toLocaleString()],
		['test-tube', 'Tubes completed', s.tubesCompleted.toLocaleString()],
		['flame', 'Best combo', s.bestCombo ? `×${s.bestCombo}` : '—'],
		['zap', 'Fastest solve', s.fastest ? duration(s.fastest) : '—'],
		['hourglass', 'Time played', duration(s.seconds)],
		['calendar-check', 'Dailies solved', s.dailySolved],
		['calendar-days', 'Best daily streak', profile.daily.best],
		['alarm-clock', 'Blitz best', s.blitzBest.toLocaleString()],
		['leaf', 'Zen solved', s.zenSolved],
		['lightbulb', 'Hints used', s.hintsUsed],
		['undo-2', 'Undos', s.undos],
		['coins', 'Coins earned', s.coinsEarned.toLocaleString()]
	]);

	// The last five weeks of daily challenges, oldest first.
	const days = $derived(
		Array.from({ length: 35 }, (_, i) => {
			const now = new Date();
			const key = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 34 + i));
			return { key, stars: profile.daily.done[key]?.stars ?? 0, today: i === 34 };
		})
	);
</script>

<section class="stats">
	<header>
		<button class="icon-button" aria-label="Back" onclick={() => go('home')}
			><ChevronLeft size={24} /></button
		>
		<h1>Stats</h1>
	</header>
	<div class="scroll">
		<div class="rank-card pane">
			<span class="orb badge">{rank.level}</span>
			<div>
				<small class="label">Rank</small>
				<b>{rank.title}</b>
				<span class="tube-bar"><span style:width="{rank.progress * 100}%"></span></span>
				<small
					>{profile.score.toLocaleString()} points · {rank.toNext.toLocaleString()} to next rank</small
				>
			</div>
		</div>

		<h2 class="label">Daily challenges</h2>
		<div class="calendar pane" aria-label="Daily challenges from the last five weeks">
			{#each days as day (day.key)}
				<span
					class="day orb"
					class:empty={!day.stars}
					class:today={day.today}
					data-stars={day.stars}
					title="{day.key}: {day.stars ? `${day.stars}★` : 'not played'}"
				></span>
			{/each}
		</div>

		<h2 class="label">Totals</h2>
		<div class="tiles pane">
			{#each tiles as [icon, label, value] (label)}
				<div class="tile">
					<span class="icon"><Icon name={icon} size={18} /></span>
					<b>{value}</b>
					<small>{label}</small>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.stats {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-rows: auto 1fr;
		height: 100%;
		width: min(640px, 100%);
		margin: 0 auto;
	}
	header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: calc(10px + env(safe-area-inset-top)) 14px 10px;
	}
	h1 {
		margin: 0;
		font-family: var(--display);
	}
	h2 {
		margin: 22px 4px 8px;
	}
	.scroll {
		overflow-y: auto;
		padding: 0 14px calc(24px + env(safe-area-inset-bottom));
	}
	.rank-card {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 16px;
	}
	.rank-card div {
		display: grid;
		gap: 4px;
		flex: 1;
	}
	.rank-card b {
		font-family: var(--display);
		font-size: 24px;
		line-height: 1.1;
	}
	.badge {
		--s: 62px;
		--c: var(--accent-2);
		font-size: 28px;
	}
	small {
		color: var(--muted);
	}
	/* Five weeks of sockets; each solved daily drops a ball in, brighter for more stars. */
	.calendar {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		justify-items: center;
		gap: 8px 4px;
		padding: 14px 10px;
	}
	.day {
		--s: min(36px, 9vw);
		box-shadow: inset 0 -2px 4px rgb(0 0 0 / 0.18);
	}
	.day[data-stars='1'] {
		--c: color-mix(in oklab, var(--accent-2), #fff 20%);
	}
	.day[data-stars='2'] {
		--c: color-mix(in oklab, var(--accent-2), var(--accent));
	}
	.day[data-stars='3'] {
		--c: var(--accent);
	}
	.day.today {
		outline: 2px solid var(--text);
		outline-offset: 2px;
	}
	.tiles {
		display: grid;
		grid-template-columns: 1fr 1fr;
		padding: 0 14px;
	}
	.tile {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		column-gap: 8px;
		padding: 12px 0 12px 2px;
	}
	.tile:nth-child(n + 3) {
		border-top: 1px solid var(--edge);
	}
	.tile:nth-child(even) {
		padding-left: 14px;
		border-left: 1px solid var(--edge);
	}
	.icon {
		grid-row: span 2;
		color: var(--accent);
	}
	.tile b {
		font-size: 22px;
		line-height: 1.1;
	}
</style>
