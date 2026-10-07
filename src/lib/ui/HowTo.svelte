<script>
	import { skinById } from '../game/cosmetics.js';
	import { nav } from '../state/nav.svelte.js';
	import { profile } from '../state/profile.svelte.js';
	import Ball from './Ball.svelte';
	import Modal from './Modal.svelte';

	const skin = $derived(skinById(profile.skin));
</script>

{#snippet tube(/** @type {number[]} */ colors, /** @type {boolean} */ hidden = false)}
	<span class="tube">
		{#each colors as c, i (i)}
			<Ball color={c} {skin} size={22} hidden={hidden && i < colors.length - 1} />
		{/each}
	</span>
{/snippet}

<Modal title="How to play" onclose={() => (nav.dialog = '')} wide>
	<div class="howto">
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
				A ball can only land on <b>the same color</b> or in an <b>empty tube</b>, and tubes hold a
				limited number.
			</p>
		</section>
		<section>
			<div class="art">{@render tube([3, 3, 3, 3])}{@render tube([1, 1, 1, 1])}</div>
			<p><b>Fill every tube with one color</b> to win. Finished tubes get a lid.</p>
		</section>
		<section>
			<div class="art"><span class="big">⭐⭐⭐</span></div>
			<p>
				Finish close to <b>par</b> (the fewest moves we found) for three stars. Beat par for a big bonus.
			</p>
		</section>
		<section>
			<div class="art"><span class="big">🔥×3</span></div>
			<p>Complete tubes in quick succession to build a <b>combo</b> for extra points.</p>
		</section>
		<section>
			<div class="art">{@render tube([4, 2, 0], true)}</div>
			<p><b>Mystery levels</b> hide every ball under the top one until you uncover it.</p>
		</section>
		<section>
			<div class="art"><span class="big">💡🧪</span></div>
			<p>
				Stuck? A <b>hint</b> shows a winning move; an <b>extra tube</b> gives you room. Undo and restart
				are always free.
			</p>
		</section>
		<section>
			<div class="art"><span class="big">⌨️</span></div>
			<p>
				Keys: <kbd>1</kbd>–<kbd>0</kbd> pick tubes, <kbd>Z</kbd> undo, <kbd>R</kbd> restart,
				<kbd>H</kbd>
				hint, <kbd>Esc</kbd> put down.
			</p>
		</section>
		<button class="primary" onclick={() => (nav.dialog = '')}>Let’s play!</button>
	</div>
</Modal>

<style>
	.howto {
		display: grid;
		gap: 12px;
	}
	section {
		display: grid;
		grid-template-columns: 110px 1fr;
		align-items: center;
		gap: 12px;
	}
	p {
		margin: 0;
	}
	.art {
		display: flex;
		align-items: end;
		justify-content: center;
		gap: 4px;
	}
	.tube {
		display: flex;
		flex-direction: column-reverse;
		gap: 1px;
		padding: 2px 2px 3px;
		min-height: 20px;
		border: 2px solid var(--glass-edge);
		border-top: none;
		border-radius: 0 0 12px 12px;
		background: var(--glass);
	}
	.arrow,
	.no {
		align-self: center;
		font-weight: 800;
	}
	.no {
		color: #ff4d5e;
	}
	.big {
		font-size: 24px;
	}
	kbd {
		padding: 0 5px;
		border-radius: 5px;
		background: var(--surface-strong);
		font-family: inherit;
		font-size: 13px;
	}
</style>
