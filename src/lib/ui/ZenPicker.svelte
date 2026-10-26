<script>
	import { skinById } from '../game/cosmetics.js';
	import { ZEN_PRESETS } from '../game/levels.js';
	import { sound } from '../fx/audio.js';
	import { go, nav } from '../state/nav.svelte.js';
	import { profile } from '../state/profile.svelte.js';
	import { hasSave, startZen } from '../state/session.svelte.js';
	import Ball from './Ball.svelte';
	import Modal from './Modal.svelte';

	const presets = /** @type {(keyof typeof ZEN_PRESETS)[]} */ (Object.keys(ZEN_PRESETS));
	const skin = $derived(skinById(profile.skin));

	/**
	 * A small mixed-up rack that shows a preset's size: its colors, tube height, and
	 * empty tubes. The mix is fixed, so the picture never changes.
	 * @param {import('../game/generator.js').PuzzleSpec} spec
	 */
	function rack({ colors, capacity, empty }) {
		const filled = Array.from({ length: colors }, (_, t) =>
			Array.from({ length: capacity }, (_, j) => (t * 3 + j * (2 + (t % 3))) % colors)
		);
		return [...filled, ...Array.from({ length: empty }, () => [])];
	}

	/** @param {keyof typeof ZEN_PRESETS} preset */
	function pick(preset) {
		sound.tap();
		startZen(preset);
		go('play');
	}
</script>

<Modal title="Zen" onclose={() => (nav.dialog = '')}>
	<p class="intro">Endless puzzles, no clock. Pick a size.</p>
	<div class="presets">
		{#each presets as id (id)}
			{@const p = ZEN_PRESETS[id]}
			<button class="preset pane" onclick={() => pick(id)}>
				<span class="name">
					<b>{p.label}</b>
					<small>{p.spec.colors} colors{p.spec.mystery ? ' · mystery' : ''}</small>
				</span>
				<span class="rack" style:--rows={p.spec.capacity} aria-hidden="true">
					{#each rack(p.spec) as tube, t (t)}
						<span class="tube">
							{#each tube as color, j (j)}
								<Ball {color} {skin} size={9} hidden={p.spec.mystery && j < tube.length - 1} />
							{/each}
						</span>
					{/each}
				</span>
				{#if hasSave((s) => s.mode === 'zen' && s.preset === id)}<span class="resume">Resume</span
					>{/if}
			</button>
		{/each}
	</div>
</Modal>

<style>
	.intro {
		margin: 0 0 14px;
		color: var(--muted);
	}
	.presets {
		display: grid;
		gap: 10px;
	}
	.preset {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 76px;
		padding: 10px 16px;
		border-radius: 20px;
		text-align: left;
	}
	.name {
		display: grid;
	}
	.name b {
		font-size: 20px;
	}
	small {
		color: var(--muted);
	}
	.rack {
		display: flex;
		align-items: end;
		gap: 2px;
	}
	.tube {
		display: flex;
		flex-direction: column-reverse;
		gap: 1px;
		height: calc(var(--rows) * 10px + 3px);
		padding: 1px 1px 2px;
		border: 1.5px solid var(--glass-rim);
		border-top: none;
		border-radius: 0 0 6px 6px;
		background: var(--glass);
	}
	.resume {
		position: absolute;
		top: -7px;
		left: 14px;
		padding: 1px 8px;
		border-radius: 999px;
		background: var(--accent-2);
		color: #fff;
		font-size: 11px;
		font-weight: 700;
	}
</style>
