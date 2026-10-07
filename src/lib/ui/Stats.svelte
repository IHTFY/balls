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
		<div class="rank-card">
			<span class="badge">{rank.level}</span>
			<div>
				<small>Rank</small>
				<b>{rank.title}</b>
				<div class="bar"><span style:width="{rank.progress * 100}%"></span></div>
				<small
					>{profile.score.toLocaleString()} points · {rank.toNext.toLocaleString()} to next rank</small
				>
			</div>
		</div>

		<h2>Daily challenges</h2>
		<div class="calendar" aria-label="Daily challenges from the last five weeks">
			{#each days as day (day.key)}
				<span
					class="day"
					class:today={day.today}
					data-stars={day.stars}
					title="{day.key}: {day.stars ? `${day.stars}★` : 'not played'}"
				></span>
			{/each}
		</div>

		<div class="tiles">
			{#each tiles as [icon, label, value] (label)}
				<div class="tile">
					<span><Icon name={icon} size={22} /></span>
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
		margin: 16px 0 8px;
		font-size: 16px;
		color: var(--muted);
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
		border-radius: 22px;
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--accent-2), transparent 60%),
			color-mix(in srgb, var(--accent), transparent 75%)
		);
	}
	.rank-card div {
		display: grid;
		gap: 4px;
		flex: 1;
	}
	.rank-card b {
		font-family: var(--display);
		font-size: 24px;
	}
	.badge {
		display: grid;
		place-items: center;
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--accent), var(--accent-2));
		color: #fff;
		font-size: 28px;
		font-weight: 800;
	}
	small {
		color: var(--muted);
	}
	.bar {
		height: 8px;
		border-radius: 999px;
		background: var(--surface-strong);
		overflow: hidden;
	}
	.bar span {
		display: block;
		height: 100%;
		background: linear-gradient(90deg, var(--accent-2), var(--accent));
	}
	.calendar {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 5px;
		max-width: 320px;
	}
	.day {
		aspect-ratio: 1;
		border-radius: 6px;
		background: var(--surface);
	}
	.day[data-stars='1'] {
		background: color-mix(in srgb, var(--accent), transparent 70%);
	}
	.day[data-stars='2'] {
		background: color-mix(in srgb, var(--accent), transparent 40%);
	}
	.day[data-stars='3'] {
		background: var(--accent);
	}
	.day.today {
		outline: 2px solid var(--text);
	}
	.tiles {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
		gap: 10px;
		margin-top: 16px;
	}
	.tile {
		display: grid;
		gap: 2px;
		padding: 12px;
		border-radius: 18px;
		background: var(--surface);
	}
	.tile span {
		color: var(--accent);
	}
	.tile b {
		font-size: 22px;
	}
</style>
