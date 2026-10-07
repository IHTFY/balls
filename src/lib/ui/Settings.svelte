<script>
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Download from '@lucide/svelte/icons/download';
	import Heart from '@lucide/svelte/icons/heart';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import { sound } from '../fx/audio.js';
	import { nav } from '../state/nav.svelte.js';
	import { install, promptInstall } from '../state/install.svelte.js';
	import { profile, resetProfile } from '../state/profile.svelte.js';
	import { updates } from '../state/updates.svelte.js';
	import Icon from './Icon.svelte';
	import Modal from './Modal.svelte';
	import { SUPPORT_URL } from '../support.js';

	const OPTIONS = /** @type {const} */ ([
		['sound', 'volume-2', 'Sound effects', ''],
		['music', 'music', 'Music', 'Gentle generated melodies'],
		['haptics', 'vibrate', 'Vibration', 'On supported phones'],
		['symbols', 'shapes', 'Color symbols', 'Shapes on balls for color-blind play'],
		['stacks', 'layers', 'Move stacks', 'Move matching top balls together'],
		['targets', 'target', 'Show where it fits', 'Light up the tubes a picked-up ball can go to'],
		[
			'autoMove',
			'wand-sparkles',
			'Only-move drop',
			'Drop the ball by itself when only one tube fits'
		],
		[
			'autoFinish',
			'fast-forward',
			'Auto-finish',
			'Play out the end once only matching moves remain'
		],
		['deadEnd', 'brick-wall', 'Dead-end warnings', 'Tell me when a position can’t be solved'],
		['reducedMotion', 'turtle', 'Reduce motion', 'Calmer animations']
	]);

	let resetStep = $state(0);
	const offlineReady = !!navigator.serviceWorker?.controller;

	/** @param {keyof typeof profile.settings} key */
	function toggle(key) {
		profile.settings[key] = !profile.settings[key];
		sound.tap();
	}

	function reset() {
		if (resetStep < 2) {
			resetStep++;
			return;
		}
		resetProfile();
		resetStep = 0;
		location.reload();
	}

	const updateStatus = $derived(
		updates.waiting
			? 'A new version is downloaded and ready.'
			: updates.lastCheck === 'current'
				? 'You have the latest version.'
				: updates.lastCheck === 'offline'
					? 'You’re offline. The game still works; updates can wait.'
					: updates.lastCheck === 'failed'
						? 'Couldn’t check for updates. Try again later.'
						: ''
	);
</script>

<Modal title="Settings" onclose={() => (nav.dialog = '')}>
	<div class="options">
		{#each OPTIONS as [key, icon, label, help] (key)}
			<label class="option">
				<span class="icon"><Icon name={icon} size={20} /></span>
				<span class="text"
					><b>{label}</b>{#if help}<small>{help}</small>{/if}</span
				>
				<input
					type="checkbox"
					role="switch"
					checked={profile.settings[key]}
					onchange={() => toggle(key)}
				/>
			</label>
		{/each}
	</div>

	<h3>App</h3>
	<div class="app">
		<p>
			<span class="offline">
				{#if offlineReady}<CircleCheck size={18} /> Ready to play offline{:else}<LoaderCircle
						size={18}
					/> Preparing offline play…{/if}
			</span>
			{#if updates.version}<small>Build {updates.version}</small>{/if}
		</p>
		<button
			class="secondary"
			disabled={updates.checking || !updates.registration}
			onclick={() => (updates.waiting ? updates.apply() : updates.check())}
		>
			{updates.waiting ? 'Install update' : updates.checking ? 'Checking…' : 'Check for updates'}
		</button>
		{#if updateStatus}<small class="status" role="status">{updateStatus}</small>{/if}
		{#if install.prompt && !install.installed}
			<button class="primary" onclick={promptInstall}><Download size={20} /> Install app</button>
		{/if}
		<button class="secondary" onclick={() => (nav.dialog = 'howto')}>How to play</button>
		<a class="secondary" href={SUPPORT_URL} target="_blank" rel="noopener"
			><Heart size={20} /> Support the game</a
		>
		<button class="danger" onclick={reset}>
			{['Reset progress', 'Erase everything?', 'Really? Tap once more'][resetStep]}
		</button>
	</div>
</Modal>

<style>
	.options {
		display: grid;
		gap: 4px;
	}
	.option {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 12px;
		padding: 8px 6px;
		border-radius: 12px;
		cursor: pointer;
	}
	.option:hover {
		background: var(--surface);
	}
	.icon {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: var(--surface);
		color: var(--accent);
	}
	.text {
		display: grid;
	}
	small {
		color: var(--muted);
		font-size: 12px;
	}
	input[type='checkbox'] {
		appearance: none;
		position: relative;
		width: 46px;
		height: 28px;
		border-radius: 999px;
		background: var(--surface-strong);
		cursor: pointer;
		transition: background 0.2s;
		margin: 0;
	}
	input[type='checkbox']::after {
		content: '';
		position: absolute;
		top: 3px;
		left: 3px;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 2px 4px rgb(0 0 0 / 0.3);
		transition: transform 0.2s cubic-bezier(0.3, 1.5, 0.6, 1);
	}
	input[type='checkbox']:checked {
		background: var(--accent-2);
	}
	input[type='checkbox']:checked::after {
		transform: translateX(18px);
	}
	input[type='checkbox']:focus-visible {
		outline: 3px solid var(--accent);
		outline-offset: 2px;
	}
	h3 {
		margin: 16px 0 8px;
		font-size: 14px;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.app {
		display: grid;
		gap: 8px;
	}
	.status {
		text-align: center;
	}
	.app p {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin: 0;
	}
	.offline {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
</style>
