<script>
	import { fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import Settings from '@lucide/svelte/icons/settings';
	import { ACHIEVEMENTS } from '../game/achievements.js';
	import { skinById } from '../game/cosmetics.js';
	import { chapterName, chapterOf, isBoss } from '../game/levels.js';
	import { dateKey, isNextDay, totalStars } from '../game/profile.js';
	import { rankFor } from '../game/scoring.js';
	import { sound } from '../fx/audio.js';
	import { go, nav } from '../state/nav.svelte.js';
	import { profile } from '../state/profile.svelte.js';
	import {
		giftReady,
		hasSave,
		startBlitz,
		startDaily,
		startLevel
	} from '../state/session.svelte.js';
	import Ball from './Ball.svelte';
	import CoinChip from './CoinChip.svelte';
	import UpdatePrompt from './UpdatePrompt.svelte';
	import { SUPPORT_URL } from '../support.js';

	const rank = $derived(rankFor(profile.score));
	// Emoji balls would hide the logo's letters.
	const equipped = $derived(skinById(profile.skin));
	const skin = $derived(equipped.style === 'emoji' ? skinById('glossy') : equipped);
	const level = $derived(profile.unlocked);
	const today = dateKey();
	const dailyDone = $derived(!!profile.daily.done[today]);
	const streakAlive = $derived(
		!!profile.daily.last && (profile.daily.last === today || isNextDay(profile.daily.last, today))
	);
	const earned = $derived(Object.keys(profile.achievements).length);
	const gift = $derived(giftReady());

	let untilTomorrow = $state('');
	$effect(() => {
		const update = () => {
			const now = new Date();
			const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
			const mins = Math.ceil((midnight.getTime() - now.getTime()) / 60000);
			untilTomorrow = `${Math.floor(mins / 60)}h ${mins % 60}m`;
		};
		update();
		const timer = setInterval(update, 30_000);
		return () => clearInterval(timer);
	});

	/** @param {() => void} start */
	function play(start) {
		sound.tap();
		start();
		go('play');
	}

	const LETTERS = ['B', 'A', 'L', 'L', 'S'];
</script>

<section class="home">
	<header class="top">
		<button class="rank" onclick={() => go('stats')} aria-label="Rank {rank.level}, {rank.title}">
			<span class="rank-level">{rank.level}</span>
			<span class="rank-text">
				<b>{rank.title}</b>
				<span class="bar"><span style:width="{rank.progress * 100}%"></span></span>
			</span>
		</button>
		<div class="top-right">
			<CoinChip />
			<button class="icon-button" aria-label="Settings" onclick={() => (nav.dialog = 'settings')}>
				<Settings size={22} />
			</button>
		</div>
	</header>

	<div class="logo" aria-label="Balls">
		{#each LETTERS as letter, i (i)}
			<span class="letter" style:--i={i} aria-hidden="true">
				<Ball color={i} {skin} size={64} />
				<b>{letter}</b>
			</span>
		{/each}
	</div>
	<p class="tagline">Sort the colors. Chase the stars.</p>

	<UpdatePrompt />

	<button class="play-button primary" onclick={() => play(() => startLevel(level))}>
		<span class="play-main"
			>{hasSave((s) => s.mode === 'level' && s.level === level) ? 'Continue' : 'Play'}</span
		>
		<span class="play-sub">
			Level {level} · {chapterName(chapterOf(level))}
			{#if isBoss(level)}· 👑 Boss{/if}
		</span>
	</button>

	<div class="modes">
		<button class="mode daily" class:done={dailyDone} onclick={() => play(startDaily)}>
			<span class="emoji">📅</span>
			<b>Daily</b>
			<small>
				{#if dailyDone}✓ Done · next in {untilTomorrow}{:else}New puzzle today!{/if}
			</small>
			{#if profile.daily.streak && streakAlive}<span class="pill">🔥 {profile.daily.streak}</span
				>{/if}
		</button>
		<button class="mode" onclick={() => (nav.dialog = 'zen')}>
			<span class="emoji">🧘</span>
			<b>Zen</b>
			<small>Endless and relaxed</small>
		</button>
		<button class="mode" onclick={() => play(startBlitz)}>
			<span class="emoji">⚡</span>
			<b>Blitz</b>
			<small
				>{profile.stats.blitzBest
					? `Best ${profile.stats.blitzBest.toLocaleString()}`
					: 'Race the clock'}</small
			>
		</button>
		<button class="mode" onclick={() => go('levels')}>
			<span class="emoji">🗺️</span>
			<b>Levels</b>
			<small>⭐ {totalStars(profile)}</small>
		</button>
	</div>

	<nav class="links">
		<button onclick={() => go('shop')}><span>🛍️</span>Shop</button>
		<button onclick={() => go('trophies')}><span>🏆</span>{earned}/{ACHIEVEMENTS.length}</button>
		<button onclick={() => go('stats')}><span>📊</span>Stats</button>
		<button onclick={() => (nav.dialog = 'howto')}><span>❓</span>Help</button>
		<a href={SUPPORT_URL} target="_blank" rel="noopener"><span>❤️</span>Support</a>
	</nav>

	{#if gift}
		<button
			class="gift"
			aria-label="Open your daily gift"
			in:fly={{ y: 80, duration: 600, delay: 400, easing: backOut }}
			onclick={() => (nav.dialog = 'gift')}
		>
			🎁
		</button>
	{/if}
</section>

<style>
	.home {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		width: min(520px, 100%);
		min-height: 100%;
		margin: 0 auto;
		/* Room at the bottom so the floating gift button never covers the links. */
		padding: calc(10px + env(safe-area-inset-top)) 16px calc(96px + env(safe-area-inset-bottom));
	}
	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}
	.top-right {
		display: flex;
		gap: 6px;
		align-items: center;
	}
	.rank {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 12px 4px 4px;
		border-radius: 999px;
		background: var(--surface);
		color: var(--text);
		text-align: left;
	}
	.rank-level {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--accent), var(--accent-2));
		color: #fff;
		font-weight: 800;
		text-shadow: 0 1px 2px rgb(0 0 0 / 0.4);
	}
	.rank-text {
		display: grid;
		gap: 3px;
		font-size: 13px;
	}
	.bar {
		display: block;
		width: 110px;
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
	.logo {
		display: flex;
		gap: 4px;
		margin-top: clamp(4px, 4vh, 40px);
	}
	.letter {
		position: relative;
		display: grid;
		place-items: center;
		animation: bounce 2.4s cubic-bezier(0.3, 0, 0.3, 1) calc(var(--i) * 0.12s) infinite;
	}
	.letter > :global(*) {
		grid-area: 1 / 1;
	}
	.letter b {
		font-family: var(--display);
		font-size: 36px;
		color: #fff;
		text-shadow:
			0 2px 0 rgb(0 0 0 / 0.35),
			0 0 8px rgb(0 0 0 / 0.3);
		z-index: 1;
	}
	.tagline {
		margin: -4px 0 4px;
		color: var(--muted);
	}
	.play-button {
		display: grid;
		gap: 2px;
		width: 100%;
		padding: 16px;
		border-radius: 24px;
		font-size: 26px;
		animation: glow 2s ease-in-out infinite alternate;
	}
	.play-main {
		font-family: var(--display);
		font-size: 30px;
		line-height: 1;
	}
	.play-sub {
		font-size: 14px;
		font-weight: 600;
		opacity: 0.85;
	}
	.modes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		width: 100%;
	}
	.mode {
		position: relative;
		display: grid;
		justify-items: start;
		gap: 2px;
		padding: 14px;
		border-radius: 20px;
		background: var(--surface);
		color: var(--text);
		text-align: left;
		border: 1px solid transparent;
		transition:
			transform 0.15s,
			background 0.2s;
	}
	.mode:hover {
		background: var(--surface-strong);
		transform: translateY(-2px);
	}
	.mode.daily:not(.done) {
		border-color: var(--accent);
		box-shadow: 0 0 20px color-mix(in srgb, var(--accent), transparent 70%);
	}
	.mode .emoji {
		font-size: 28px;
	}
	.mode b {
		font-size: 18px;
	}
	.mode small {
		color: var(--muted);
	}
	.pill {
		position: absolute;
		top: 10px;
		right: 10px;
		padding: 2px 8px;
		border-radius: 999px;
		background: linear-gradient(90deg, #ff8a1f, #ff3b47);
		color: #fff;
		font-size: 12px;
		font-weight: 700;
	}
	.links {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 6px;
		width: 100%;
	}
	.links button,
	.links a {
		display: grid;
		justify-items: center;
		gap: 2px;
		padding: 10px 4px;
		border-radius: 16px;
		background: var(--surface);
		color: var(--text);
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
	}
	.links span {
		font-size: 22px;
	}
	.gift {
		position: fixed;
		right: 18px;
		bottom: calc(18px + env(safe-area-inset-bottom));
		width: 64px;
		height: 64px;
		border-radius: 50%;
		font-size: 34px;
		background: radial-gradient(circle, var(--accent) 0%, var(--accent-2) 100%);
		box-shadow: 0 10px 30px color-mix(in srgb, var(--accent-2), transparent 40%);
		animation: wiggle 2.5s ease-in-out infinite;
		z-index: 5;
	}
	@keyframes bounce {
		0%,
		60%,
		100% {
			transform: translateY(0);
		}
		30% {
			transform: translateY(-14px);
		}
		45% {
			transform: translateY(0) scale(1.08, 0.92);
		}
	}
	@keyframes glow {
		from {
			box-shadow: 0 8px 24px color-mix(in srgb, var(--accent), transparent 70%);
		}
		to {
			box-shadow: 0 8px 40px color-mix(in srgb, var(--accent), transparent 40%);
		}
	}
	@keyframes wiggle {
		0%,
		80%,
		100% {
			transform: rotate(0);
		}
		85% {
			transform: rotate(-12deg) scale(1.1);
		}
		90% {
			transform: rotate(12deg) scale(1.1);
		}
		95% {
			transform: rotate(-6deg);
		}
	}
</style>
