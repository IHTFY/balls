<script>
	import { fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import ChartNoAxesColumn from '@lucide/svelte/icons/chart-no-axes-column';
	import CircleQuestionMark from '@lucide/svelte/icons/circle-question-mark';
	import Crown from '@lucide/svelte/icons/crown';
	import Flame from '@lucide/svelte/icons/flame';
	import Flower2 from '@lucide/svelte/icons/flower-2';
	import Gamepad2 from '@lucide/svelte/icons/gamepad-2';
	import Gift from '@lucide/svelte/icons/gift';
	import Play from '@lucide/svelte/icons/play';
	import Settings from '@lucide/svelte/icons/settings';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Star from '@lucide/svelte/icons/star';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Zap from '@lucide/svelte/icons/zap';
	import { ACHIEVEMENTS, earnedCount } from '../game/achievements.js';
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
		session,
		startLevel
	} from '../state/session.svelte.js';
	import { adAsked, adForScreen, mayBeAdFree } from '../ads.js';
	import AdAside from './AdAside.svelte';
	import CoinChip from './CoinChip.svelte';
	import UpdatePrompt from './UpdatePrompt.svelte';
	import { MORE_GAMES_URL } from '../support.js';

	const rank = $derived(rankFor(profile.score));
	const level = $derived(profile.unlocked);
	// Kept current so a screen left open past midnight offers the new daily and gift.
	let today = $state(dateKey());
	const dailyDone = $derived(!!profile.daily.done[today]);
	const streakAlive = $derived(
		!!profile.daily.last && (profile.daily.last === today || isNextDay(profile.daily.last, today))
	);
	const earned = $derived(earnedCount(profile));
	const gift = $derived(giftReady(today));

	// One ad under the links, once a game has ended in this tab: not while the gift
	// button floats over the bottom or a dialog covers the screen, and not again
	// for the same game once it was asked for (the loader fills one box per key).
	const adKey = $derived(`home/${session.lastEnded}`);
	const buyer = mayBeAdFree();
	const ad = $derived(
		adForScreen('home', {
			buyer,
			played: session.lastEnded > 0 && !adAsked(adKey),
			covered: gift || !!nav.dialog
		})
	);
	/** @type {HTMLElement | undefined} */
	let links = $state();

	let untilTomorrow = $state('');
	$effect(() => {
		const update = () => {
			const now = new Date();
			today = dateKey(now);
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
</script>

<svelte:document
	onvisibilitychange={() => {
		if (document.visibilityState === 'visible') today = dateKey();
	}}
/>

<section class="home">
	<header class="top">
		<button
			class="rank pane slant"
			onclick={() => go('stats')}
			aria-label="Rank {rank.level}, {rank.title}"
		>
			<span class="orb">{rank.level}</span>
			<span class="rank-text">
				<b>{rank.title}</b>
				<span class="tube-bar"><span style:width="{rank.progress * 100}%"></span></span>
			</span>
		</button>
		<div class="top-right">
			<CoinChip />
			<button class="icon-button" aria-label="Settings" onclick={() => (nav.dialog = 'settings')}>
				<Settings size={22} />
			</button>
		</div>
	</header>

	<h1 class="logo">
		<span class="word">Balls</span>
		<svg class="streak" viewBox="0 0 300 30" aria-hidden="true">
			<defs>
				<linearGradient id="streak-fill" x1="0" x2="1">
					<stop offset="0" style="stop-color: var(--accent); stop-opacity: 0" />
					<stop offset="0.35" style="stop-color: var(--accent)" />
					<stop offset="1" style="stop-color: color-mix(in oklab, var(--accent), #fff 30%)" />
				</linearGradient>
			</defs>
			<path d="M8 26 L226 13 L214 22 L296 4 L246 12 L256 6 Z" fill="url(#streak-fill)" />
		</svg>
	</h1>

	<UpdatePrompt />

	<button class="play-button primary" onclick={() => play(() => startLevel(level))}>
		<span class="play-main"
			><Play class="play-icon" size={30} fill="currentColor" aria-hidden="true" /><span
				class="play-word"
				>{hasSave((s) => s.mode === 'level' && s.level === level) ? 'Continue' : 'Play'}</span
			></span
		>
		<span class="play-sub">
			Level {level} · {chapterName(chapterOf(level))}
			{#if isBoss(level)}· <Crown size={14} /> Boss{/if}
		</span>
	</button>

	<div class="modes">
		<button class="mode daily slant edge" class:done={dailyDone} onclick={() => play(startDaily)}>
			<span class="mode-icon"><CalendarDays size={34} /></span>
			<b>Daily</b>
			<small>
				{#if dailyDone}✓ Done · next in {untilTomorrow}{:else}New puzzle today!{/if}
			</small>
			{#if profile.daily.streak && streakAlive}<span class="pill"
					><Flame size={12} /> {profile.daily.streak}</span
				>{/if}
		</button>
		<button class="mode zen slant edge" onclick={() => (nav.dialog = 'zen')}>
			<span class="mode-icon"><Flower2 size={34} /></span>
			<b>Zen</b>
			<small>Endless and relaxed</small>
		</button>
		<button class="mode blitz slant edge" onclick={() => play(startBlitz)}>
			<span class="mode-icon"><Zap size={34} fill="currentColor" /></span>
			<b>Blitz</b>
			<small
				>{profile.stats.blitzBest
					? `Best ${profile.stats.blitzBest.toLocaleString()}`
					: 'Race the clock'}</small
			>
		</button>
		<button class="mode levels slant edge" onclick={() => go('levels')}>
			<span class="mode-icon"><Star size={34} fill="currentColor" /></span>
			<b>Levels</b>
			<small class="stars"><Star size={13} fill="currentColor" /> {totalStars(profile)}</small>
		</button>
	</div>

	<nav class="links pane slant edge" bind:this={links}>
		<button onclick={() => go('shop')}><ShoppingCart size={26} />Shop</button>
		<button onclick={() => go('trophies')}
			><Trophy class="trophy" size={26} />{earned}/{ACHIEVEMENTS.length}</button
		>
		<button onclick={() => go('stats')}><ChartNoAxesColumn size={26} />Stats</button>
		<button onclick={() => (nav.dialog = 'howto')}><CircleQuestionMark size={26} />Help</button>
		<a href={MORE_GAMES_URL} target="_blank" rel="noopener"><Gamepad2 size={26} />More games</a>
	</nav>

	{#if ad}<AdAside above={links} slot={ad.slot} {adKey} />{/if}

	{#if gift}
		<button
			class="gift orb"
			aria-label="Open your daily gift"
			in:fly={{ y: 80, duration: 600, delay: 400, easing: backOut }}
			onclick={() => (nav.dialog = 'gift')}
		>
			<Gift size={30} />
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
		padding: calc(10px + env(safe-area-inset-top)) 18px calc(96px + env(safe-area-inset-bottom));
	}
	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding-inline: 4px;
	}
	.top-right {
		display: flex;
		gap: 10px;
		align-items: center;
	}
	.rank {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
		padding: 4px 16px 4px 6px;
		text-align: left;
	}
	/* The rank sits in a slanted lime frame, like a jersey number. */
	.rank .orb {
		--s: 34px;
		width: 38px;
		border-radius: 3px;
		transform: skewX(-12deg);
		background: none;
		border: 2px solid var(--accent);
		box-shadow: 0 0 12px color-mix(in srgb, var(--accent), transparent 65%);
		color: var(--accent);
		font-size: 20px;
		text-shadow: none;
	}
	.rank-text {
		display: grid;
		gap: 5px;
		font-family: var(--display);
		font-size: 15px;
	}
	.rank-text b {
		font-weight: 800;
	}
	.rank .tube-bar {
		width: 104px;
		height: 6px;
	}
	.logo {
		position: relative;
		display: grid;
		justify-items: center;
		margin: clamp(4px, 2.5vh, 32px) 0 0;
		font-weight: 400;
	}
	/* A soft teal and violet light behind the word. */
	.logo::before {
		content: '';
		position: absolute;
		inset: -20% -25%;
		z-index: -1;
		background:
			radial-gradient(closest-side at 35% 50%, rgb(20 200 220 / 0.22), transparent),
			radial-gradient(closest-side at 72% 60%, rgb(140 90 255 / 0.24), transparent);
		filter: blur(6px);
	}
	.word {
		font-family: var(--display);
		font-size: 76px;
		font-weight: 900;
		line-height: 0.95;
		letter-spacing: -0.01em;
		text-transform: uppercase;
		padding-right: 0.08em;
		background: linear-gradient(180deg, #fff 45%, #cfdbe8);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		filter: drop-shadow(0 4px 14px rgb(0 0 0 / 0.45));
	}
	.streak {
		width: 230px;
		height: 23px;
		margin-top: -4px;
		filter: drop-shadow(0 0 8px color-mix(in srgb, var(--accent), transparent 45%));
	}
	.play-button {
		display: grid;
		gap: 2px;
		width: calc(100% - 16px);
		padding: 12px 16px 14px;
		animation: glow 2.4s ease-in-out infinite alternate;
	}
	.play-main {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		font-family: var(--display);
		font-size: 44px;
		font-weight: 900;
		line-height: 1;
	}
	/* The play triangle and the word are split by a thin slanted rule. */
	.play-word {
		padding: 0 6px 0 18px;
		border-left: 2px solid color-mix(in srgb, var(--on-accent), transparent 70%);
	}
	.play-sub {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		font-family: var(--display);
		font-size: 17px;
		font-weight: 700;
	}
	.modes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px 14px;
		width: calc(100% - 12px);
	}
	/* Glass tiles; each mode keeps its own icon color, and the edge marks the pair it belongs to. */
	.mode {
		--icon: #5fd8f0;
		display: grid;
		justify-items: center;
		align-content: center;
		gap: 0;
		min-height: 104px;
		padding: 10px 12px 12px;
		color: var(--text);
		text-align: center;
		transition: transform 0.15s;
	}
	.mode.zen {
		--icon: #a98bff;
		--edge-c: var(--accent-2);
	}
	.mode.blitz {
		--icon: var(--accent);
		--edge-c: var(--accent-2);
	}
	.mode.levels {
		--icon: var(--accent);
	}
	.mode:hover {
		transform: translateY(-2px);
	}
	/* Today's puzzle, still open, gets the brighter rim. */
	.mode.daily:not(.done)::before {
		border-color: color-mix(in srgb, var(--accent), transparent 35%);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.08),
			0 0 18px color-mix(in srgb, var(--accent), transparent 75%);
	}
	.mode-icon {
		display: grid;
		margin-bottom: 4px;
		color: var(--icon);
		filter: drop-shadow(0 0 8px color-mix(in srgb, var(--icon), transparent 55%));
	}
	.stars {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.stars :global(svg) {
		color: #ffcf3f;
	}
	.mode b {
		font-family: var(--display);
		font-size: 26px;
		font-weight: 900;
		line-height: 1.1;
	}
	.mode small {
		font-size: 15px;
		font-weight: 500;
		color: color-mix(in oklab, var(--text), var(--muted) 30%);
	}
	.mode small.stars {
		font-family: var(--display);
		font-size: 20px;
		font-weight: 800;
		color: var(--text);
	}
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		position: absolute;
		top: 8px;
		right: 14px;
		padding: 2px 8px;
		border-radius: 3px;
		transform: skewX(-12deg);
		background: linear-gradient(90deg, #ff8a1f, #ff3b47);
		color: #fff;
		font-size: 12px;
		font-weight: 700;
	}
	/* One glass shelf, split by hairlines, instead of five boxes. */
	.links {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		width: calc(100% - 12px);
		padding: 4px 6px;
	}
	.links button,
	.links a {
		display: grid;
		justify-items: center;
		gap: 4px;
		padding: 9px 2px 8px;
		background: none;
		border: 0;
		color: var(--text);
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
	}
	.links :global(.trophy) {
		color: #ffcf3f;
	}
	.links > * + * {
		border-left: 1px solid var(--edge);
	}
	.links a {
		padding-inline: 0;
		white-space: nowrap;
	}
	/* The gift is a big ball waiting to be tapped. */
	.gift {
		--s: 64px;
		position: fixed;
		right: 18px;
		bottom: calc(18px + env(safe-area-inset-bottom));
		box-shadow:
			inset 0 0 0 1px rgb(255 255 255 / 0.14),
			0 10px 30px color-mix(in srgb, var(--accent-2), transparent 40%);
		animation: wiggle 2.5s ease-in-out infinite;
		z-index: 5;
	}
	/* Short phones: smaller logo and tiles so the links stay on screen. */
	@media (max-height: 700px) {
		.home {
			gap: 10px;
		}
		.word {
			font-size: 60px;
		}
		.streak {
			width: 180px;
			height: 18px;
		}
		.mode {
			min-height: 92px;
		}
		.mode-icon :global(svg) {
			width: 28px;
			height: 28px;
		}
		.mode b {
			font-size: 22px;
		}
		.play-main {
			font-size: 36px;
		}
	}
	:global(.app.idle) .play-button,
	:global(.app.idle) .gift {
		animation-play-state: paused;
	}
	@keyframes glow {
		from {
			filter: drop-shadow(0 0 6px color-mix(in srgb, var(--accent), transparent 80%));
		}
		to {
			filter: drop-shadow(0 0 18px color-mix(in srgb, var(--accent), transparent 55%));
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
