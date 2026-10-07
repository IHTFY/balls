<script>
	import { sound } from '../fx/audio.js';
	import { nav } from '../state/nav.svelte.js';
	import { install, promptInstall } from '../state/install.svelte.js';
	import { profile, resetProfile } from '../state/profile.svelte.js';
	import { updates } from '../state/updates.svelte.js';
	import Modal from './Modal.svelte';
	import { SUPPORT_URL } from '../support.js';

	const OPTIONS = /** @type {const} */ ([
		['sound', '🔊', 'Sound effects', ''],
		['music', '🎵', 'Music', 'Gentle generated melodies'],
		['haptics', '📳', 'Vibration', 'On supported phones'],
		['symbols', '🔷', 'Color symbols', 'Shapes on balls for color-blind play'],
		['stacks', '🧲', 'Move stacks', 'Move matching top balls together'],
		['deadEnd', '🧱', 'Dead-end warnings', 'Tell me when a position can’t be solved'],
		['reducedMotion', '🐢', 'Reduce motion', 'Calmer animations']
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
				<span class="icon">{icon}</span>
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
			{offlineReady ? '✅ Ready to play offline' : '⏳ Preparing offline play…'}
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
			<button class="primary" onclick={promptInstall}>📲 Install app</button>
		{/if}
		<button class="secondary" onclick={() => (nav.dialog = 'howto')}>How to play</button>
		<a class="secondary" href={SUPPORT_URL} target="_blank" rel="noopener">❤️ Support the game</a>
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
		font-size: 22px;
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
		margin: 0;
	}
</style>
