<script>
	import Flame from '@lucide/svelte/icons/flame';
	import Keyboard from '@lucide/svelte/icons/keyboard';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import Star from '@lucide/svelte/icons/star';
	import TestTube from '@lucide/svelte/icons/test-tube';
	import { skinById } from '../game/cosmetics.js';
	import { nav } from '../state/nav.svelte.js';
	import { profile } from '../state/profile.svelte.js';
	import Ball from './Ball.svelte';
	import Modal from './Modal.svelte';

	const skin = $derived(skinById(profile.skin));
	// Keys only matter with a keyboard.
	const keys = matchMedia('(pointer: fine)').matches;
	const count = keys ? 8 : 7;

	/** @type {HTMLDivElement} */
	let pages;
	let page = $state(0);
	const last = $derived(page === count - 1);

	function onscroll() {
		page = Math.round(pages.scrollLeft / pages.clientWidth);
	}

	/** @param {number} i */
	function show(i) {
		pages.scrollTo({ left: i * pages.clientWidth, behavior: 'smooth' });
	}
</script>

{#snippet tube(/** @type {number[]} */ colors, /** @type {boolean} */ hidden = false)}
	<span class="tube">
		{#each colors as c, i (i)}
			<Ball color={c} {skin} size={34} hidden={hidden && i < colors.length - 1} />
		{/each}
	</span>
{/snippet}

<Modal title="How to play" onclose={() => (nav.dialog = '')} wide>
	<div class="pages" bind:this={pages} {onscroll}>
		<section>
			<div class="art">
				{@render tube([0, 1, 0])}<span class="arrow">→</span>{@render tube([1, 1])}
			</div>
			<p>
				<b>Tap a tube</b> to pick up its top ball, then <b>tap another tube</b> to drop it there.
			</p>
		</section>
		<section>
			<div class="art">{@render tube([2, 0])}<span class="no">✕</span>{@render tube([1, 1])}</div>
			<p>
				A ball lands only on <b>the same color</b> or in an <b>empty tube</b>, and a tube holds only
				so many.
			</p>
		</section>
		<section>
			<div class="art">{@render tube([3, 3, 3, 3])}{@render tube([1, 1, 1, 1])}</div>
			<p><b>Fill every tube with one color</b> to win.</p>
		</section>
		<section>
			<div class="art stars">
				{#each [1, 2, 3] as n (n)}<Star size={n === 2 ? 44 : 34} fill="currentColor" />{/each}
			</div>
			<p>
				Finish close to <b>par</b>, the fewest moves we found, for three stars. Beat it for a bonus.
			</p>
		</section>
		<section>
			<div class="art">
				<span class="orb combo"><Flame size={30} /></span><b class="times">×3</b>
			</div>
			<p>Fill tubes one after another to build a <b>combo</b> for extra points.</p>
		</section>
		<section>
			<div class="art">{@render tube([4, 2, 0], true)}</div>
			<p><b>Mystery levels</b> hide each ball until it reaches the top.</p>
		</section>
		<section>
			<div class="art">
				<span class="orb"><Lightbulb size={30} /></span><span class="orb"
					><TestTube size={30} /></span
				>
			</div>
			<p>
				Stuck? A <b>hint</b> shows a winning move, and an <b>extra tube</b> gives you room. Undo and restart
				are free.
			</p>
		</section>
		{#if keys}
			<section>
				<div class="art"><span class="orb"><Keyboard size={30} /></span></div>
				<p>
					<kbd>1</kbd>–<kbd>0</kbd> pick tubes, <kbd>Z</kbd> undo, <kbd>R</kbd> restart,
					<kbd>H</kbd> hint, <kbd>Esc</kbd> put down.
				</p>
			</section>
		{/if}
	</div>
	<div class="dots" role="tablist" aria-label="Pages">
		{#each Array.from({ length: count }, (_, i) => i) as i (i)}
			<button
				role="tab"
				class="dot"
				class:on={i === page}
				aria-selected={i === page}
				aria-label="Page {i + 1}"
				onclick={() => show(i)}
			></button>
		{/each}
	</div>
	<button class="primary next" onclick={() => (last ? (nav.dialog = '') : show(page + 1))}>
		{last ? 'Let’s play!' : 'Next'}
	</button>
</Modal>

<style>
	/* One idea per page; swipe or tap Next. */
	.pages {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 100%;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		overscroll-behavior-x: contain;
		scrollbar-width: none;
	}
	.pages::-webkit-scrollbar {
		display: none;
	}
	section {
		display: grid;
		grid-template-rows: 150px auto;
		justify-items: center;
		align-content: start;
		gap: 14px;
		padding: 0 8px;
		scroll-snap-align: center;
		text-align: center;
	}
	p {
		margin: 0;
		max-width: 300px;
		font-size: 17px;
		min-height: 3lh;
	}
	.art {
		display: flex;
		align-items: end;
		justify-content: center;
		gap: 10px;
		width: 100%;
		padding-bottom: 8px;
	}
	.tube {
		display: flex;
		flex-direction: column-reverse;
		gap: 2px;
		padding: 3px 3px 4px;
		min-height: 30px;
		border: 2.5px solid var(--glass-rim);
		border-top: none;
		border-radius: 0 0 20px 20px;
		background:
			linear-gradient(90deg, transparent 12%, rgb(255 255 255 / 0.25) 18%, transparent 30%),
			var(--glass);
	}
	.arrow,
	.no {
		align-self: center;
		font-size: 26px;
		font-weight: 800;
	}
	.no {
		color: #ff4d5e;
	}
	.stars {
		align-items: center;
		color: #ffcf3f;
		filter: drop-shadow(0 0 10px rgb(255 207 63 / 0.5));
	}
	.art .orb {
		--s: 64px;
		align-self: center;
	}
	.combo {
		--c: #ff7a1f;
	}
	.times {
		align-self: center;
		font-size: 34px;
		color: var(--accent);
	}
	.dots {
		display: flex;
		justify-content: center;
		gap: 6px;
		margin: 14px 0;
	}
	.dot {
		width: 9px;
		height: 9px;
		padding: 0;
		border-radius: 999px;
		background: var(--surface-strong);
		transition:
			width 0.2s ease-in-out,
			background 0.2s;
	}
	.dot.on {
		width: 24px;
		background: var(--accent);
	}
	.next {
		width: 100%;
	}
	kbd {
		padding: 0 6px;
		border-radius: 6px;
		background: var(--surface-strong);
		font-family: inherit;
		font-size: 15px;
	}
</style>
