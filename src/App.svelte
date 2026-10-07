<script>
	import { fade } from 'svelte/transition';
	import { MediaQuery } from 'svelte/reactivity';
	import { themeById } from './lib/game/cosmetics.js';
	import { setMusic, setSound, suspendAudio, unlockAudio } from './lib/fx/audio.js';
	import { setHaptics } from './lib/fx/haptics.js';
	import { setReducedMotion } from './lib/fx/particles.js';
	import { nav } from './lib/state/nav.svelte.js';
	import { persist, profile } from './lib/state/profile.svelte.js';
	import { giftReady } from './lib/state/session.svelte.js';
	import Ambience from './lib/ui/Ambience.svelte';
	import FxLayer from './lib/ui/FxLayer.svelte';
	import GiftDialog from './lib/ui/GiftDialog.svelte';
	import Home from './lib/ui/Home.svelte';
	import HowTo from './lib/ui/HowTo.svelte';
	import LevelMap from './lib/ui/LevelMap.svelte';
	import Play from './lib/ui/Play.svelte';
	import Settings from './lib/ui/Settings.svelte';
	import Shop from './lib/ui/Shop.svelte';
	import Stats from './lib/ui/Stats.svelte';
	import Toasts from './lib/ui/Toasts.svelte';
	import Trophies from './lib/ui/Trophies.svelte';
	import ZenPicker from './lib/ui/ZenPicker.svelte';

	const theme = $derived(themeById(profile.theme));
	const prefersReduced = new MediaQuery('prefers-reduced-motion: reduce');
	const reduced = $derived(profile.settings.reducedMotion || prefersReduced.current);
	let audioReady = $state(false);

	$effect(() => {
		const root = document.documentElement.style;
		for (const [key, value] of Object.entries(theme.vars)) root.setProperty(key, value);
		root.colorScheme = theme.light ? 'light' : 'dark';
		document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.chrome);
	});

	// Save shortly after any change; the play timer changes the profile every second.
	$effect(() => {
		JSON.stringify(profile);
		const timer = setTimeout(persist, 500);
		return () => clearTimeout(timer);
	});

	$effect(() => setSound(profile.settings.sound));
	$effect(() => setHaptics(profile.settings.haptics));
	$effect(() => setReducedMotion(reduced));
	$effect(() => {
		if (audioReady) setMusic(profile.settings.music);
	});

	$effect(() => {
		// Offer the daily gift once per launch to returning players.
		if (giftReady() && profile.stats.solved > 0) {
			const timer = setTimeout(() => {
				if (nav.screen === 'home' && !nav.dialog) nav.dialog = 'gift';
			}, 900);
			return () => clearTimeout(timer);
		}
	});

	function wakeAudio() {
		unlockAudio();
		audioReady = true;
	}
</script>

<svelte:window onpointerdown={wakeAudio} onkeydown={wakeAudio} onpagehide={persist} />
<svelte:document
	onvisibilitychange={() => {
		const hidden = document.visibilityState === 'hidden';
		suspendAudio(hidden);
		// Mobile browsers may close a backgrounded app without another event.
		if (hidden) persist();
	}}
/>

<div class="app" class:reduced>
	<Ambience kind={theme.ambience} color={theme.vars['--particle']} {reduced} />
	{#key nav.screen}
		<main class="screen" in:fade={{ duration: 180 }}>
			{#if nav.screen === 'home'}
				<Home />
			{:else if nav.screen === 'levels'}
				<LevelMap />
			{:else if nav.screen === 'play'}
				<Play {reduced} />
			{:else if nav.screen === 'shop'}
				<Shop />
			{:else if nav.screen === 'trophies'}
				<Trophies />
			{:else if nav.screen === 'stats'}
				<Stats />
			{/if}
		</main>
	{/key}

	{#if nav.dialog === 'settings'}
		<Settings />
	{:else if nav.dialog === 'howto'}
		<HowTo />
	{:else if nav.dialog === 'zen'}
		<ZenPicker />
	{:else if nav.dialog === 'gift'}
		<GiftDialog />
	{/if}

	<Toasts />
	<FxLayer />
</div>

<style>
	.app {
		position: relative;
		height: 100%;
		background: var(--bg);
		color: var(--text);
		overflow: hidden;
	}
	.screen {
		position: absolute;
		inset: 0;
		overflow-y: auto;
	}
</style>
