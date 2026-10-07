<script>
	import { ZEN_PRESETS } from '../game/levels.js';
	import { sound } from '../fx/audio.js';
	import { go, nav } from '../state/nav.svelte.js';
	import { hasSave, startZen } from '../state/session.svelte.js';
	import Icon from './Icon.svelte';
	import Modal from './Modal.svelte';

	const presets = /** @type {(keyof typeof ZEN_PRESETS)[]} */ (Object.keys(ZEN_PRESETS));

	/** @param {keyof typeof ZEN_PRESETS} preset */
	function pick(preset) {
		sound.tap();
		startZen(preset);
		go('play');
	}
</script>

<Modal title="Zen mode" onclose={() => (nav.dialog = '')}>
	<p class="intro">Endless puzzles with no pressure. Pick your pace.</p>
	<div class="presets">
		{#each presets as id (id)}
			{@const p = ZEN_PRESETS[id]}
			<button class="preset" onclick={() => pick(id)}>
				<span class="icon"><Icon name={p.icon} size={34} /></span>
				<b>{p.label}</b>
				<small>
					{p.spec.colors} colors · {p.spec.capacity} tall{p.spec.mystery ? ' · mystery' : ''}
				</small>
				{#if hasSave((s) => s.mode === 'zen' && s.preset === id)}<span class="resume">Resume</span
					>{/if}
			</button>
		{/each}
	</div>
</Modal>

<style>
	.intro {
		margin: 0 0 12px;
		color: var(--muted);
	}
	.presets {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.preset {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 4px;
		padding: 16px 8px;
		border-radius: 18px;
		background: var(--surface);
		color: var(--text);
	}
	.preset:hover {
		background: var(--surface-strong);
	}
	.icon {
		color: var(--accent);
	}
	small {
		color: var(--muted);
	}
	.resume {
		position: absolute;
		top: 8px;
		right: 8px;
		padding: 1px 8px;
		border-radius: 999px;
		background: var(--accent-2);
		color: #fff;
		font-size: 11px;
		font-weight: 700;
	}
</style>
