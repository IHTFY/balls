<script>
	import { scale } from 'svelte/transition';
	import { elasticOut } from 'svelte/easing';
	import { burst } from '../fx/particles.js';
	import { sound } from '../fx/audio.js';
	import { nav } from '../state/nav.svelte.js';
	import { claimGift, giftDay, GIFTS } from '../state/session.svelte.js';
	import Modal from './Modal.svelte';

	const day = giftDay();
	/** @type {(typeof GIFTS)[number] | null} */
	let opened = $state(null);

	/** @param {(typeof GIFTS)[number]} g */
	const describe = (g) =>
		[g.coins && `🪙 ${g.coins}`, g.hints && `💡 ${g.hints}`, g.tubes && `🧪 ${g.tubes}`]
			.filter(Boolean)
			.join(' + ');

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

<Modal title="Daily gift" onclose={() => (nav.dialog = '')}>
	<div class="gift">
		<div class="week">
			{#each GIFTS as g, i (i)}
				<div class="day" class:today={i + 1 === day} class:past={i + 1 < day}>
					<small>Day {i + 1}</small>
					<span>{describe(g)}</span>
				</div>
			{/each}
		</div>
		{#if opened}
			<div class="reward" in:scale={{ duration: 700, easing: elasticOut }}>
				<span class="big">✨</span>
				<b>{describe(opened)}</b>
				<small>Come back tomorrow for day {(day % GIFTS.length) + 1}!</small>
			</div>
			<button class="primary" onclick={() => (nav.dialog = '')}>Collect</button>
		{:else}
			<button class="chest" onclick={open} aria-label="Open gift">🎁</button>
			<p>Tap to open · Day {day} of your streak</p>
		{/if}
	</div>
</Modal>

<style>
	.gift {
		display: grid;
		justify-items: center;
		gap: 12px;
		text-align: center;
	}
	.week {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
		width: 100%;
	}
	.day {
		display: grid;
		gap: 2px;
		padding: 6px 2px;
		border-radius: 10px;
		background: var(--surface);
		font-size: 10px;
	}
	.day small {
		color: var(--muted);
	}
	.day.past {
		opacity: 0.45;
	}
	.day.today {
		background: linear-gradient(135deg, var(--accent), var(--accent-2));
		color: #fff;
	}
	.day.today small {
		color: #fff;
	}
	.chest {
		font-size: 96px;
		background: none;
		padding: 0;
		animation: shake 1.6s ease-in-out infinite;
		filter: drop-shadow(0 10px 20px rgb(0 0 0 / 0.4));
	}
	.reward {
		display: grid;
		gap: 4px;
	}
	.reward b {
		font-size: 28px;
	}
	.big {
		font-size: 60px;
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
