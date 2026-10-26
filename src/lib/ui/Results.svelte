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
	import Icon from './Icon.svelte';
	import RollingNumber from './RollingNumber.svelte';
	import AdAside from './AdAside.svelte';

	/**
	 * @type {{ result: import('../state/session.svelte.js').Result,
	 *   onnext: () => void, onreplay: () => void, onhome: () => void }}
	 */
	let { result, onnext, onreplay, onhome } = $props();

	const blitz = $derived(result.mode === 'blitz');
	const rankUp = $derived(result.rankAfter.level > result.rankBefore.level);

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
			{#if result.trophies.length}
				<!-- In the heading row, so the ad below keeps its room; the list is under the ad. -->
				<p class="new-trophy" in:scale={{ delay: 700, duration: 300, start: 0.6 }}>
					<span class="orb"><Icon name="trophy" size={11} /></span>
					{result.trophies.length > 1 ? `${result.trophies.length} new trophies` : 'New trophy'}
				</p>
			{/if}
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
			<div class="facts pane">
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
			<div class="facts pane">
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
				<ul class="lines pane rows">
					{#each result.lines as line, i (line.label)}
						<li in:fly={{ x: -20, delay: 500 + result.stars * 320 + i * 90, duration: 300 }}>
							<span>{line.label}</span><b>+{line.points.toLocaleString()}</b>
						</li>
					{/each}
				</ul>
			{/if}

			{#if result.trophies.length}
				<ul class="trophies pane rows" aria-label="New trophies">
					{#each result.trophies as t (t.id)}
						<li>
							<span class="orb"><Icon name={t.icon} size={18} /></span>
							<b>{t.title}</b>
							<span class="reward">+{t.reward} <Coin size={16} /></span>
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

			<div class="rank pane">
				<span class="orb">{result.rankAfter.level}</span>
				<div>
					<div class="rank-label">
						<span
							>{#if rankUp}<b>Rank up!</b>{/if}
							{result.rankAfter.title}</span
						>
						<small>{result.rankAfter.toNext.toLocaleString()} to next</small>
					</div>
					<span class="tube-bar"><span style:width="{rankShown * 100}%"></span></span>
				</div>
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
		color: var(--text);
		font-size: 15px;
		font-weight: 700;
	}
	h2 {
		margin: 0;
		font-family: var(--display);
		font-size: 40px;
		font-weight: 700;
		line-height: 1.1;
		background: linear-gradient(
			180deg,
			color-mix(in oklab, var(--accent), #fff 35%),
			var(--accent) 60%
		);
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
		filter: drop-shadow(0 3px 0 color-mix(in oklab, var(--accent), #6a2a00 45%))
			drop-shadow(0 0 18px color-mix(in srgb, var(--accent), transparent 65%));
	}
	/* The stars sit on a soft arc of light. */
	.stars {
		position: relative;
		isolation: isolate;
		display: flex;
		align-items: flex-end;
		gap: 8px;
		height: 60px;
	}
	.stars::before {
		content: '';
		position: absolute;
		inset: 30% -40% -30%;
		border-radius: 50%;
		background: radial-gradient(
			closest-side,
			color-mix(in srgb, var(--accent), transparent 70%),
			transparent
		);
		opacity: 0;
		transition: opacity 0.6s;
		z-index: -1;
	}
	.stars:has(.earned)::before {
		opacity: 1;
	}
	.star {
		font-size: 46px;
		line-height: 1;
		color: var(--surface-strong);
		transition: color 0.2s;
	}
	.star.mid {
		font-size: 60px;
		margin-bottom: 6px;
	}
	.star.earned {
		background: linear-gradient(180deg, #fff1a6, #ffd23a 45%, #f5a300);
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
		filter: drop-shadow(0 0 12px rgb(255 207 63 / 0.6));
		animation: star-pop 0.5s cubic-bezier(0.3, 1.8, 0.5, 1);
	}
	.facts {
		display: flex;
		width: 100%;
		padding: 2px 0;
	}
	.facts div {
		display: grid;
		flex: 1;
		min-width: 0;
		padding: 6px 8px;
	}
	.facts div + div {
		border-left: 1px solid var(--edge);
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
		font-size: 24px;
		line-height: 1.2;
		font-variant-numeric: tabular-nums;
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
	.new-trophy {
		display: flex;
		align-items: center;
		gap: 5px;
		margin: 0;
		padding: 1px 10px 1px 1px;
		border-radius: 999px;
		background: var(--well);
		border: 1px solid var(--pane-rim);
		font-size: 13px;
		font-weight: 700;
	}
	.new-trophy .orb {
		--s: 20px;
	}
	.trophies {
		list-style: none;
		margin: 0;
		padding: 2px 14px;
		width: 100%;
	}
	.trophies li {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 0;
		text-align: left;
	}
	.trophies .orb {
		--s: 34px;
	}
	.trophies b {
		flex: 1;
	}
	.reward {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: var(--accent);
		font-weight: 700;
	}
	.best {
		margin: 0;
		padding: 0 10px;
		border-radius: 999px;
		background: var(--accent);
		color: var(--on-accent);
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
		padding: 2px 16px;
		width: 100%;
	}
	.lines li {
		display: flex;
		justify-content: space-between;
		padding: 7px 0;
		font-weight: 600;
	}
	.lines b {
		color: var(--accent);
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
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		text-align: left;
	}
	.rank > div {
		display: grid;
		flex: 1;
		gap: 6px;
	}
	.rank .orb {
		--s: 36px;
		font-size: 17px;
		font-weight: 800;
	}
	.rank-label {
		display: flex;
		justify-content: space-between;
		font-size: 14px;
		font-weight: 600;
	}
	.rank-label small {
		color: var(--muted);
	}
	.rank-label b {
		color: var(--accent);
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
