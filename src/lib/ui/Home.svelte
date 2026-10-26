<script>
	import { fly } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import Crown from '@lucide/svelte/icons/crown';
	import Flame from '@lucide/svelte/icons/flame';
	import Gift from '@lucide/svelte/icons/gift';
	import Settings from '@lucide/svelte/icons/settings';
	import Star from '@lucide/svelte/icons/star';
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
	import { SUPPORT_URL } from '../support.js';
	import ballB from '../../assets/logo/ball-b.webp';
	import ballA from '../../assets/logo/ball-a.webp';
	import ballL1 from '../../assets/logo/ball-l1.webp';
	import ballL2 from '../../assets/logo/ball-l2.webp';
	import ballS from '../../assets/logo/ball-s.webp';
	import dailyIcon from '../../assets/icons/daily.webp';
	import zenIcon from '../../assets/icons/zen.webp';
	import blitzIcon from '../../assets/icons/blitz.webp';
	import levelsIcon from '../../assets/icons/levels.webp';
	import shopIcon from '../../assets/icons/shop.webp';
	import trophiesIcon from '../../assets/icons/trophies.webp';
	import statsIcon from '../../assets/icons/stats.webp';
	import helpIcon from '../../assets/icons/help.webp';
	import supportIcon from '../../assets/icons/support.webp';

	const rank = $derived(rankFor(profile.score));
	const level = $derived(profile.unlocked);
	const today = dateKey();
	const dailyDone = $derived(!!profile.daily.done[today]);
	const streakAlive = $derived(
		!!profile.daily.last && (profile.daily.last === today || isNextDay(profile.daily.last, today))
	);
	const earned = $derived(earnedCount(profile));
	const gift = $derived(giftReady());

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

	const LETTERS = [ballB, ballA, ballL1, ballL2, ballS];
</script>

<section class="home">
	<header class="top">
		<button
			class="rank pane"
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

	<div class="logo" aria-label="Balls">
		{#each LETTERS as src, i (i)}
			<img class="letter" style:--i={i} {src} alt="" width="66" height="66" />
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
			{#if isBoss(level)}· <Crown size={14} /> Boss{/if}
		</span>
	</button>

	<div class="modes">
		<button class="mode daily" class:done={dailyDone} onclick={() => play(startDaily)}>
			<img class="mode-icon" src={dailyIcon} alt="" />
			<b>Daily</b>
			<small>
				{#if dailyDone}✓ Done · next in {untilTomorrow}{:else}New puzzle today!{/if}
			</small>
			{#if profile.daily.streak && streakAlive}<span class="pill"
					><Flame size={12} /> {profile.daily.streak}</span
				>{/if}
		</button>
		<button class="mode zen" onclick={() => (nav.dialog = 'zen')}>
			<img class="mode-icon" src={zenIcon} alt="" />
			<b>Zen</b>
			<small>Endless and relaxed</small>
		</button>
		<button class="mode blitz" onclick={() => play(startBlitz)}>
			<img class="mode-icon" src={blitzIcon} alt="" />
			<b>Blitz</b>
			<small
				>{profile.stats.blitzBest
					? `Best ${profile.stats.blitzBest.toLocaleString()}`
					: 'Race the clock'}</small
			>
		</button>
		<button class="mode levels" onclick={() => go('levels')}>
			<img class="mode-icon" src={levelsIcon} alt="" />
			<b>Levels</b>
			<small class="stars"><Star size={13} fill="currentColor" /> {totalStars(profile)}</small>
		</button>
	</div>

	<nav class="links pane" bind:this={links}>
		<button onclick={() => go('shop')}><img src={shopIcon} alt="" />Shop</button>
		<button onclick={() => go('trophies')}
			><img src={trophiesIcon} alt="" />{earned}/{ACHIEVEMENTS.length}</button
		>
		<button onclick={() => go('stats')}><img src={statsIcon} alt="" />Stats</button>
		<button onclick={() => (nav.dialog = 'howto')}><img src={helpIcon} alt="" />Help</button>
		<a href={SUPPORT_URL} target="_blank" rel="noopener"
			><img src={supportIcon} alt="" />Support ♥</a
		>
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
		gap: 10px;
		padding: 4px 16px 4px 4px;
		border-radius: 999px;
		text-align: left;
	}
	.rank .orb {
		--s: 36px;
	}
	.rank-text {
		display: grid;
		gap: 4px;
		font-size: 14px;
	}
	.rank .tube-bar {
		width: 110px;
		height: 10px;
	}
	.logo {
		display: flex;
		gap: 2px;
		margin-top: clamp(4px, 2.5vh, 32px);
		filter: drop-shadow(0 8px 10px rgb(0 0 0 / 0.3));
	}
	.letter {
		width: 66px;
		height: 66px;
		animation: bounce 2.4s cubic-bezier(0.3, 0, 0.3, 1) calc(var(--i) * 0.12s) infinite;
	}
	.tagline {
		margin: -4px 0 4px;
		color: color-mix(in oklab, var(--text), var(--muted) 35%);
		font-size: 17px;
		font-weight: 600;
	}
	.play-button {
		display: grid;
		gap: 2px;
		width: 100%;
		padding: 13px 16px 15px;
		border-radius: 22px;
		font-size: 26px;
		animation: glow 2s ease-in-out infinite alternate;
	}
	.play-main {
		font-family: var(--display);
		font-size: 34px;
		font-weight: 700;
		line-height: 1;
	}
	.play-sub {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		font-size: 15px;
		font-weight: 600;
		opacity: 0.9;
	}
	.modes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		width: 100%;
	}
	/* Each mode keeps its own color in every theme, measured from the home mockup. */
	.mode {
		--card: #681179;
		--card-edge: #ab2fc1;
		position: relative;
		display: grid;
		justify-items: start;
		gap: 0;
		padding: 12px 14px;
		border-radius: 18px;
		background: linear-gradient(180deg, color-mix(in oklab, var(--card), #fff 8%), var(--card) 60%);
		border: 1.5px solid var(--card-edge);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.18),
			0 6px 16px rgb(0 0 0 / 0.22);
		color: #fff;
		text-align: left;
		transition:
			transform 0.15s,
			filter 0.2s,
			box-shadow 0.2s;
	}
	.mode.zen {
		--card: #076e64;
		--card-edge: #19b19c;
	}
	.mode.blitz {
		--card: #114ff6;
		--card-edge: #3584fc;
	}
	.mode.levels {
		--card: #3f54d0;
		--card-edge: #6e86fb;
	}
	.mode:hover {
		filter: brightness(1.08);
		transform: translateY(-2px);
	}
	.mode.daily:not(.done) {
		border-color: var(--accent);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.18),
			0 0 20px color-mix(in srgb, var(--accent), transparent 60%);
	}
	.mode-icon {
		width: 48px;
		height: 48px;
		margin-bottom: 4px;
		filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.25));
	}
	.stars {
		display: inline-flex;
		align-items: center;
		gap: 3px;
	}
	.stars :global(svg) {
		color: #ffcf3f;
	}
	.mode b {
		font-size: 22px;
		line-height: 1.15;
	}
	.mode small {
		font-size: 15px;
		font-weight: 600;
		color: rgb(255 255 255 / 0.82);
	}
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 3px;
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
	/* One glass shelf, split by hairlines, instead of five boxes. */
	.links {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		width: 100%;
		padding: 4px 0;
	}
	.links button,
	.links a {
		display: grid;
		justify-items: center;
		gap: 4px;
		padding: 8px 4px 7px;
		background: none;
		border: 0;
		color: var(--text);
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
	}
	.links img {
		width: 28px;
		height: 28px;
	}
	.links > * + * {
		border-left: 1px solid var(--edge);
	}
	.links a {
		padding-inline: 0;
		white-space: nowrap;
	}
	/* The gift is a big glossy ball waiting to be tapped. */
	.gift {
		--s: 64px;
		position: fixed;
		right: 18px;
		bottom: calc(18px + env(safe-area-inset-bottom));
		box-shadow:
			inset 0 -3px 6px rgb(0 0 0 / 0.2),
			0 10px 30px color-mix(in srgb, var(--accent-2), transparent 40%);
		animation: wiggle 2.5s ease-in-out infinite;
		z-index: 5;
	}
	/* Short phones: smaller logo and card art so the links stay on screen. */
	@media (max-height: 700px) {
		.home {
			gap: 10px;
		}
		.letter {
			width: 56px;
			height: 56px;
		}
		.mode-icon {
			width: 36px;
			height: 36px;
		}
		.mode b {
			font-size: 20px;
		}
		.play-main {
			font-size: 30px;
		}
	}
	:global(.app.idle) .letter,
	:global(.app.idle) .play-button,
	:global(.app.idle) .gift {
		animation-play-state: paused;
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
