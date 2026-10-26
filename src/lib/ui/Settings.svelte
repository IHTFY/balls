<script>
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Download from '@lucide/svelte/icons/download';
	import HandHeart from '@lucide/svelte/icons/hand-heart';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Shield from '@lucide/svelte/icons/shield';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CircleHelp from '@lucide/svelte/icons/circle-question-mark';
	import { sound } from '../fx/audio.js';
	import { nav } from '../state/nav.svelte.js';
	import { install, promptInstall } from '../state/install.svelte.js';
	import { profile, resetProfile } from '../state/profile.svelte.js';
	import { updates } from '../state/updates.svelte.js';
	import Icon from './Icon.svelte';
	import Modal from './Modal.svelte';
	import { SUPPORT_URL } from '../support.js';

	const GROUPS = /** @type {const} */ ([
		[
			'Sound',
			[
				['sound', 'volume-2', 'Sound effects', ''],
				['music', 'music', 'Music', 'Relaxed background tunes'],
				['haptics', 'vibrate', 'Vibration', 'On supported phones']
			]
		],
		[
			'Helpers',
			[
				['stacks', 'layers', 'Move stacks', 'Move matching top balls together'],
				[
					'targets',
					'target',
					'Show where it fits',
					'Light up the tubes a picked-up ball can go to'
				],
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
				['deadEnd', 'brick-wall', 'Dead-end warnings', 'Tell me when a position can’t be solved']
			]
		],
		[
			'Display',
			[
				['symbols', 'case-upper', 'Color letters', 'A letter on each ball for color-blind play'],
				['reducedMotion', 'turtle', 'Reduce motion', 'Calmer animations']
			]
		]
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
	{#each GROUPS as [group, options] (group)}
		<h3 class="label">{group}</h3>
		<div class="pane rows">
			{#each options as [key, icon, label, help] (key)}
				<label class="row">
					<span class="orb"><Icon name={icon} size={18} /></span>
					<span class="text"
						><b>{label}</b>{#if help}<small>{help}</small>{/if}</span
					>
					<input
						class="switch"
						type="checkbox"
						role="switch"
						checked={profile.settings[key]}
						onchange={() => toggle(key)}
					/>
				</label>
			{/each}
		</div>
	{/each}

	<h3 class="label">App</h3>
	<div class="pane rows">
		<div class="row">
			<span class="orb" class:empty={!offlineReady}
				>{#if offlineReady}<CircleCheck size={18} />{:else}<LoaderCircle size={18} />{/if}</span
			>
			<span class="text">
				<b>{offlineReady ? 'Ready to play offline' : 'Preparing offline play…'}</b>
				{#if updateStatus}<small role="status">{updateStatus}</small>{/if}
				{#if updates.version}<small>Build {updates.version}</small>{/if}
			</span>
			<button
				class="secondary small"
				disabled={updates.checking || !updates.registration}
				aria-label={updates.waiting ? 'Install update' : 'Check for updates'}
				onclick={() => (updates.waiting ? updates.apply() : updates.check())}
			>
				{updates.waiting ? 'Install' : updates.checking ? 'Checking…' : 'Check'}
			</button>
		</div>
		{#if install.prompt && !install.installed}
			<button class="row link" onclick={promptInstall}>
				<span class="orb"><Download size={18} /></span><b>Install app</b><ChevronRight size={20} />
			</button>
		{/if}
		<button class="row link" onclick={() => (nav.dialog = 'howto')}>
			<span class="orb"><CircleHelp size={18} /></span><b>How to play</b><ChevronRight size={20} />
		</button>
		<a class="row link" href={SUPPORT_URL} target="_blank" rel="noopener">
			<span class="orb"><HandHeart size={18} /></span><b>Support ♥</b><ChevronRight size={20} />
		</a>
		<a class="row link" href="https://ihtfy.com/privacy/" target="_blank" rel="noopener">
			<span class="orb"><Shield size={18} /></span><b>Privacy</b><ChevronRight size={20} />
		</a>
	</div>
	<button class="danger reset" onclick={reset}>
		{['Reset progress', 'Erase everything?', 'Really? Tap once more'][resetStep]}
	</button>
</Modal>

<style>
	.label {
		margin: 16px 4px 8px;
	}
	.label:first-of-type {
		margin-top: 0;
	}
	.pane {
		padding: 0 14px;
		border-radius: 20px;
	}
	.row {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 56px;
		padding: 9px 0;
		background: none;
		color: var(--text);
		text-align: left;
		text-decoration: none;
		cursor: pointer;
	}
	div.row {
		cursor: default;
	}
	.row .orb {
		--s: 34px;
	}
	.link :global(svg:last-child) {
		color: var(--muted);
	}
	button.row:active:not(:disabled),
	a.row:active {
		transform: none;
		opacity: 0.7;
	}
	.text {
		display: grid;
	}
	small {
		color: var(--muted);
		font-size: 12px;
	}
	.small {
		min-height: 36px;
		padding: 6px 14px;
		border-radius: 999px;
		font-size: 14px;
	}
	.reset {
		width: 100%;
		margin-top: 16px;
	}
</style>
