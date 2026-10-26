<script>
	import Gift from '@lucide/svelte/icons/gift';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import Check from '@lucide/svelte/icons/check';
	import TestTube from '@lucide/svelte/icons/test-tube';
	import { scale } from 'svelte/transition';
	import { elasticOut } from 'svelte/easing';
	import { burst } from '../fx/particles.js';
	import { sound } from '../fx/audio.js';
	import { nav } from '../state/nav.svelte.js';
	import { claimGift, giftDay, GIFTS } from '../state/session.svelte.js';
	import Coin from './Coin.svelte';
	import Modal from './Modal.svelte';

	const day = giftDay();
	/** @type {(typeof GIFTS)[number] | null} */
	let opened = $state(null);

	/** @param {MouseEvent} event */
	function open(event) {
		opened = claimGift();
		if (!opened) return;
		sound.buy();
		setTimeout(() => sound.coin(), 300);
		const rect = /** @type {HTMLElement} */ (event.currentTarget).getBoundingClientRect();
		burst(rect.left + rect.width / 2, rect.top, ['#ffcf3f', '#ff5fc8', '#3fd8ff', '#fff'], 50);
	}
</script>

{#snippet items(/** @type {(typeof GIFTS)[number]} */ g, /** @type {number} */ size)}
	{#if g.coins}<span class="item" role="img" aria-label="{g.coins} coins"
			><Coin {size} />{g.coins}</span
		>{/if}
	{#if g.hints}<span
			class="item"
			role="img"
			aria-label="{g.hints} {g.hints === 1 ? 'hint' : 'hints'}"><Lightbulb {size} />{g.hints}</span
		>{/if}
	{#if g.tubes}<span
			class="item"
			role="img"
			aria-label="{g.tubes} {g.tubes === 1 ? 'tube' : 'tubes'}"><TestTube {size} />{g.tubes}</span
		>{/if}
{/snippet}

<Modal title="Daily gift" onclose={() => (nav.dialog = '')}>
	<div class="gift">
		<div class="week">
			{#each GIFTS as g, i (i)}
				{@const past = i + 1 < day}
				<div class="day" class:today={i + 1 === day} class:past>
					<span class="orb" class:empty={i + 1 > day}
						>{#if past}<Check size={16} strokeWidth={3} />{:else}{i + 1}{/if}</span
					>
					<span class="items">{@render items(g, 11)}</span>
				</div>
			{/each}
		</div>
		{#if opened}
			<div class="reward" in:scale={{ duration: 700, easing: elasticOut }}>
				<b class="items">{@render items(opened, 26)}</b>
				<small>Come back tomorrow for day {(day % GIFTS.length) + 1}!</small>
			</div>
			<button class="primary" onclick={() => (nav.dialog = '')}>Collect</button>
		{:else}
			<button class="chest" onclick={open} aria-label="Open gift"><Gift size={64} /></button>
			<p>Tap to open · Day {day} of your streak</p>
		{/if}
	</div>
</Modal>

<style>
	.gift {
		display: grid;
		justify-items: center;
		gap: 14px;
		text-align: center;
	}
	/* The week is a row of ball sockets: filled for days collected, glowing for today. */
	.week {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
		width: 100%;
	}
	.day {
		display: grid;
		justify-items: center;
		align-content: start;
		gap: 4px;
		font-size: 10px;
		color: var(--muted);
	}
	.day .orb {
		--s: 34px;
		--c: var(--accent-2);
		font-size: 15px;
	}
	.day.today .orb {
		--c: var(--accent);
		color: var(--on-accent);
		text-shadow: none;
		box-shadow:
			inset 0 -2px 5px rgb(0 0 0 / 0.18),
			0 0 16px color-mix(in srgb, var(--accent), transparent 40%);
	}
	.day.today {
		color: var(--text);
		font-weight: 700;
	}
	.items {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0 4px;
	}
	.item {
		display: inline-flex;
		align-items: center;
		gap: 2px;
	}
	/* The gift sits in a big glossy ball, like a capsule from a ball machine. */
	.chest {
		display: grid;
		place-items: center;
		width: 132px;
		height: 132px;
		margin-top: 6px;
		border-radius: 50%;
		padding: 0;
		color: #fff;
		background:
			radial-gradient(ellipse 30% 19% at 36% 23%, rgb(255 255 255 / 0.75), transparent),
			radial-gradient(
				circle at 40% 34%,
				rgb(255 255 255 / 0.25),
				transparent 40%,
				rgb(0 0 0 / 0.32) 100%
			),
			var(--accent-2);
		box-shadow:
			inset 0 -4px 10px rgb(0 0 0 / 0.2),
			0 12px 30px color-mix(in srgb, var(--accent-2), transparent 50%);
		animation: shake 1.6s ease-in-out infinite;
	}
	.chest :global(svg) {
		filter: drop-shadow(0 2px 2px rgb(0 0 0 / 0.35));
	}
	.reward {
		display: grid;
		gap: 4px;
	}
	.reward b {
		font-size: 28px;
	}
	small,
	p {
		color: var(--muted);
		margin: 0;
	}
	@keyframes shake {
		0%,
		70%,
		100% {
			transform: rotate(0);
		}
		75% {
			transform: rotate(-10deg) scale(1.05);
		}
		85% {
			transform: rotate(10deg) scale(1.05);
		}
		95% {
			transform: rotate(-4deg);
		}
	}
</style>
