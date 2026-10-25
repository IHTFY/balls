<script>
	import { fade, fly, scale } from 'svelte/transition';
	import { backOut, elasticOut } from 'svelte/easing';
	import Flame from '@lucide/svelte/icons/flame';
	import Share2 from '@lucide/svelte/icons/share-2';
	import { adForScreen, mayBeAdFree, playAdBeside } from '../ads.js';
	import { sound } from '../fx/audio.js';
	import { clock } from '../game/format.js';
	import { notify } from '../state/toasts.svelte.js';
	import Coin from './Coin.svelte';
	import RollingNumber from './RollingNumber.svelte';
	import AdAside from './AdAside.svelte';

	/**
	 * @type {{ result: import('../state/session.svelte.js').Result,
	 *   onnext: () => void, onreplay: () => void, onhome: () => void }}
	 */
	let { result, onnext, onreplay, onhome } = $props();

	const blitz = $derived(result.mode === 'blitz');

	// One ad per game over, under the buttons so it is in view with the result. A buyer gets no box at all, and neither does a window with the play ad beside the puzzle.
	const ad = adForScreen('results', {
		buyer: mayBeAdFree(),
		played: true,
		beside: playAdBeside()
	});
	/** @type {HTMLDivElement | undefined} */
	let actions = $state();
	/** @type {HTMLElement | undefined} */
	let screen = $state();
	// Confetti from the win stops here, so none falls over the ad.
	$effect(() => {
		const previous = /** @type {HTMLElement | null} */ (document.activeElement);
		document.documentElement.dataset.results = '';
		screen?.querySelector('button')?.focus({ preventScroll: true });
		return () => {
			delete document.documentElement.dataset.results;
			previous?.focus?.({ preventScroll: true });
		};
	});
	let shown = $state(0);
	let total = $state(0);
	let rankShown = $state(0);

	$effect(() => {
		/** @type {ReturnType<typeof setTimeout>[]} */
		const timers = [];
		const at = (/** @type {number} */ ms, /** @type {() => void} */ fn) =>
			timers.push(setTimeout(fn, ms));
		rankShown = result.rankBefore.level === result.rankAfter.level ? result.rankBefore.progress : 0;
		for (let n = 1; n <= result.stars; n++)
			at(250 + n * 320, () => {
				shown = n;
				sound.star(n);
			});
		const tallyAt = 400 + result.stars * 320;
		at(tallyAt, () => (total = result.score));
		if (result.coins) at(tallyAt + 600, () => sound.coin());
		at(tallyAt + 500, () => (rankShown = result.rankAfter.progress));
		if (result.rankAfter.level > result.rankBefore.level)
			at(tallyAt + 1100, () =>
				notify({
					icon: 'medal',
					title: `Rank up: ${result.rankAfter.title}`,
					body: `You reached rank ${result.rankAfter.level}`
				})
			);
		return () => timers.forEach(clearTimeout);
	});

	const heading = $derived(
		blitz
			? 'Time’s up!'
			: result.stars === 3
				? ['Perfect!', 'Brilliant!', 'Superb!'][result.moves % 3]
				: result.stars === 2
					? 'Great job!'
					: 'Solved!'
	);

	async function share() {
		const stars = '⭐'.repeat(result.stars) + '☆'.repeat(3 - result.stars);
		const text = blitz
			? `Balls Blitz: ${result.solved} puzzles, ${result.score.toLocaleString()} points!`
			: `Balls · ${result.title} ${stars}\n${result.moves} moves (par ${result.par}) in ${clock(result.seconds)}`;
		const url = location.href.split('#')[0];
		try {
			if (navigator.share) await navigator.share({ text, url });
			else {
				await navigator.clipboard.writeText(`${text}\n${url}`);
				notify({ icon: 'clipboard-check', title: 'Copied!', body: 'Paste it anywhere to share' });
			}
		} catch (error) {
			if (/** @type {Error} */ (error).name !== 'AbortError')
				notify({
					icon: 'triangle-alert',
					title: 'Couldn’t share',
					body: 'Your browser blocked it'
				});
		}
	}
</script>

<section
	class="results"
	aria-label="{result.title} results"
	bind:this={screen}
	in:fade={{ duration: 200 }}
>
	<div class="win">
		<div class="head">
			<p class="kicker">{result.title}</p>
			{#if result.newBest && (blitz || result.previousStars)}
				<p class="best" in:scale={{ delay: 500, duration: 400, easing: backOut }}>
					{blitz ? 'New high score!' : 'New best!'}
				</p>
			{/if}
		</div>
		<h2 in:scale={{ start: 0.4, duration: 600, easing: elasticOut }}>{heading}</h2>

		{#if !blitz}
			<div class="stars" aria-label="{result.stars} of 3 stars">
				{#each [1, 2, 3] as n (n)}
					<span class="star" class:earned={shown >= n} class:mid={n === 2}>★</span>
				{/each}
			</div>
			<div class="facts">
				<div><small>Moves</small><strong>{result.moves}</strong><em>par {result.par}</em></div>
				<div><small>Time</small><strong>{clock(result.seconds)}</strong></div>
				<div>
					<small>Score</small>
					<strong><RollingNumber value={total} start={0} duration={900} /></strong>
				</div>
				{#if result.streak}
					<div>
						<small>Streak</small><strong class="streak"><Flame size={20} /> {result.streak}</strong
						><em>days</em>
					</div>
				{/if}
			</div>
		{:else}
			<div class="facts">
				<div><small>Solved</small><strong>{result.solved}</strong></div>
				<div><small>Score</small><strong>{result.score.toLocaleString()}</strong></div>
			</div>
		{/if}

		<div class="actions" bind:this={actions}>
			<button class="secondary" onclick={onhome}
				>{result.mode === 'level' ? 'Levels' : 'Home'}</button
			>
			{#if result.mode === 'daily' || blitz}
				<button class="secondary" onclick={share} aria-label="Share"
					><Share2 size={18} /> Share</button
				>
			{:else}
				<button class="secondary" onclick={onreplay}>Replay</button>
			{/if}
			{#if result.mode !== 'daily'}
				<button class="primary" onclick={onnext}>{blitz ? 'Play again' : 'Next ›'}</button>
			{/if}
		</div>

		{#if ad}<AdAside above={actions} slot={ad.slot} adKey="{result.mode}/{result.ended}" />{/if}

		<div class="details">
			{#if result.lines.length}
				<ul class="lines">
					{#each result.lines as line, i (line.label)}
						<li in:fly={{ x: -20, delay: 500 + result.stars * 320 + i * 90, duration: 300 }}>
							<span>{line.label}</span><b>+{line.points.toLocaleString()}</b>
						</li>
					{/each}
				</ul>
			{/if}

			{#if result.coins}
				<div
					class="coins"
					in:scale={{ delay: 900 + result.stars * 320, duration: 500, easing: elasticOut }}
				>
					+{result.coins}
					<Coin size={24} />
				</div>
			{/if}

			<div class="rank">
				<div class="rank-label">
					<span>Rank {result.rankAfter.level} · {result.rankAfter.title}</span>
					<small>{result.rankAfter.toNext.toLocaleString()} to next</small>
				</div>
				<div class="bar"><div style:width="{rankShown * 100}%"></div></div>
			</div>
		</div>
	</div>
</section>

<style>
	/* A screen of its own, not a dialog: the ad box stays in the page, uncovered. */
	.results {
		height: 100%;
		overflow-y: auto;
		padding: calc(10px + env(safe-area-inset-top)) 12px calc(16px + env(safe-area-inset-bottom));
	}
	.win {
		display: grid;
		justify-items: center;
		text-align: center;
		gap: 8px;
		width: min(420px, 100%);
		margin: 0 auto;
	}
	.head {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.kicker {
		margin: 0;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 12px;
	}
	h2 {
		margin: 0;
		font-family: var(--display);
		font-size: 34px;
		line-height: 1.15;
		background: linear-gradient(90deg, var(--accent), var(--accent-2));
		background-clip: text;
		color: transparent;
	}
	.stars {
		display: flex;
		align-items: flex-end;
		gap: 6px;
		height: 56px;
	}
	.star {
		font-size: 44px;
		line-height: 1;
		color: var(--surface-strong);
		transition: color 0.2s;
	}
	.star.mid {
		font-size: 56px;
	}
	.star.earned {
		color: #ffcf3f;
		text-shadow: 0 0 22px rgb(255 207 63 / 0.7);
		animation: star-pop 0.5s cubic-bezier(0.3, 1.8, 0.5, 1);
	}
	.facts {
		display: flex;
		gap: 8px;
		width: 100%;
	}
	.facts div {
		display: grid;
		flex: 1;
		min-width: 0;
		padding: 6px 8px;
		border-radius: 14px;
		background: var(--surface);
	}
	.facts small,
	.facts em {
		color: var(--muted);
		font-size: 11px;
		font-style: normal;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.facts strong {
		font-size: 22px;
	}
	.streak {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
	}
	.streak :global(svg) {
		color: #ff8a1f;
	}
	.best {
		margin: 0;
		padding: 0 10px;
		border-radius: 999px;
		background: var(--accent-2);
		color: #fff;
		font-size: 13px;
		font-weight: 700;
	}
	.actions {
		display: flex;
		gap: 8px;
		width: 100%;
	}
	.actions button {
		flex: 1;
	}
	.details {
		display: grid;
		justify-items: center;
		gap: 10px;
		width: 100%;
		margin-top: 8px;
	}
	.lines {
		list-style: none;
		margin: 0;
		padding: 0;
		width: 100%;
		display: grid;
		gap: 2px;
	}
	.lines li {
		display: flex;
		justify-content: space-between;
		padding: 2px 8px;
		color: var(--muted);
	}
	.lines b {
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}
	.coins {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 24px;
		font-weight: 700;
		color: var(--accent);
	}
	.rank {
		width: 100%;
		display: grid;
		gap: 4px;
	}
	.rank-label {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
	}
	.rank-label small {
		color: var(--muted);
	}
	.bar {
		height: 10px;
		border-radius: 999px;
		background: var(--surface);
		overflow: hidden;
	}
	.bar div {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--accent-2), var(--accent));
		transition: width 1s cubic-bezier(0.3, 1, 0.4, 1);
	}
	@keyframes star-pop {
		0% {
			transform: scale(0.2) rotate(-40deg);
		}
		100% {
			transform: scale(1) rotate(0);
		}
	}
</style>
