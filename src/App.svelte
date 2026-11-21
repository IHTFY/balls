<script>
	import { fade } from 'svelte/transition';
	import { MediaQuery } from 'svelte/reactivity';
	import { themeById } from './lib/game/cosmetics.js';
	import {
		setMusic,
		setMusicHurry,
		setMusicScene,
		setSound,
		suspendAudio,
		unlockAudio
	} from './lib/fx/audio.js';
	import { setHaptics } from './lib/fx/haptics.js';
	import { setReducedMotion } from './lib/fx/particles.js';
	import { activity, watchActivity } from './lib/state/activity.svelte.js';
	import { back, nav } from './lib/state/nav.svelte.js';
	import { persist, profile } from './lib/state/profile.svelte.js';
	import { giftReady, session } from './lib/state/session.svelte.js';
	import Ambience from './lib/ui/Ambience.svelte';
	import FxLayer from './lib/ui/FxLayer.svelte';
	import GiftDialog from './lib/ui/GiftDialog.svelte';
	import Home from './lib/ui/Home.svelte';
	import HowTo from './lib/ui/HowTo.svelte';
	import LevelMap from './lib/ui/LevelMap.svelte';
	import Play from './lib/ui/Play.svelte';
	import PlayAd from './lib/ui/PlayAd.svelte';
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
		// Light themes set properties that dark themes take from app.css, so drop them on a switch.
		return () => {
			for (const key of Object.keys(theme.vars)) root.removeProperty(key);
		};
	});

	// Clock-only changes flush on hide or close; player actions save shortly afterward.
	const progress = $derived(
		JSON.stringify(profile, (key, value) => (key === 'seconds' ? 0 : value))
	);
	$effect(() => {
		progress;
		const timer = setTimeout(persist, 500);
		return () => clearTimeout(timer);
	});

	$effect(() => setSound(profile.settings.sound));
	$effect(() => setHaptics(profile.settings.haptics));
	$effect(() => setReducedMotion(reduced));
	$effect(watchActivity);
	const blitzOn = $derived(
		nav.screen === 'play' && session.mode === 'blitz' && !session.blitz.over
	);
	$effect(() => setMusicScene(nav.screen !== 'play' ? 'menu' : blitzOn ? 'blitz' : 'play'));
	// The last ten seconds of a Blitz run, the same stretch that ticks.
	$effect(() => setMusicHurry(blitzOn && session.blitz.left <= 10));
	$effect(() => {
		if (audioReady) setMusic(profile.settings.music);
	});

	// Offer the daily gift once per launch to returning players. The profile changes whenever
	// this or another open copy saves, so the offer is remembered rather than made again.
	// The installed app's launch (src/lib/ui/launch.js) runs about 1.3 s, so it waits that out.
	let offered = false;
	const giftDelay = document.documentElement.classList.contains('launching') ? 1400 : 900;
	$effect(() => {
		if (offered || !giftReady() || profile.stats.solved === 0) return;
		const timer = setTimeout(() => {
			offered = true;
			if (nav.screen === 'home' && !nav.dialog) nav.dialog = 'gift';
		}, giftDelay);
		return () => clearTimeout(timer);
	});

	// The phone's back button steps back through the app instead of closing it. Away
	// from the home screen one extra history entry is kept; Back consumes it, the app
	// takes one step back, and the entry is pushed again unless that step reached home.
	const atHome = $derived(nav.screen === 'home' && !nav.dialog);
	let dropping = $state(false);
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let dropTimer;
	let entryIndex = currentEntryIndex();

	function navApi() {
		return /** @type {{ canGoBack?: boolean; currentEntry?: { index?: number } } | undefined} */ (
			/** @type {{ navigation?: unknown }} */ (window).navigation
		);
	}

	function currentEntryIndex() {
		const index = navApi()?.currentEntry?.index;
		return typeof index === 'number' && index >= 0 ? index : null;
	}

	function clearDropTimer() {
		clearTimeout(dropTimer);
		dropTimer = undefined;
	}

	function pushGuard() {
		history.pushState({ guard: true }, '');
		entryIndex = currentEntryIndex();
	}

	function dropGuard() {
		const api = navApi();
		const knowBack = typeof api?.canGoBack === 'boolean';
		const hasBack = knowBack ? api.canGoBack : history.length > 1;
		if (hasBack) {
			dropping = true;
			if (!knowBack) {
				clearDropTimer();
				// Without the Navigation API, history.length > 1 can include forward-only
				// entries, so history.back() may never fire popstate.
				dropTimer = setTimeout(() => {
					dropTimer = undefined;
					if (!dropping) return;
					if (history.state?.guard) history.replaceState(null, '');
					dropping = false;
				}, 250);
			}
			history.back();
		} else {
			history.replaceState(null, '');
		}
	}

	$effect(() => {
		const home = atHome;
		if (dropping) return;
		const guarded = Boolean(history.state?.guard);
		if (!home && !guarded) {
			pushGuard();
		} else if (home && guarded) {
			// Drop the entry on returning home or after a reload so the next Back leaves.
			dropGuard();
		}
	});

	function onpopstate() {
		const nextIndex = currentEntryIndex();
		const forward = entryIndex !== null && nextIndex !== null && nextIndex > entryIndex;
		entryIndex = nextIndex;
		if (dropping) {
			clearDropTimer();
			dropping = false;
			return;
		}
		if (atHome) {
			if (history.state?.guard) {
				if (forward) history.forward();
				else if (entryIndex !== null) dropGuard();
			}
			return;
		}
		back();
		if (!atHome) pushGuard();
	}

	/** @param {PageTransitionEvent} event */
	function onpageshow(event) {
		if (!event.persisted) return;
		entryIndex = currentEntryIndex();
		clearDropTimer();
		dropping = false;
		if (atHome && history.state?.guard) dropGuard();
	}

	function wakeAudio() {
		unlockAudio();
		audioReady = true;
	}
</script>

<svelte:window
	onpointerdown={wakeAudio}
	onkeydown={wakeAudio}
	onpagehide={persist}
	{onpageshow}
	{onpopstate}
/>
<svelte:document
	onvisibilitychange={() => {
		const hidden = document.visibilityState === 'hidden';
		suspendAudio(hidden);
		// Mobile browsers may close a backgrounded app without another event.
		if (hidden) persist();
	}}
/>

<div class="app" class:reduced class:idle={activity.idle}>
	<Ambience kind={theme.ambience} color={theme.vars['--particle']} {reduced} />
	{#key nav.screen}
		<main class="screen" in:fade={{ duration: 180 }}>
			{#if nav.screen === 'home'}
				<Home />
			{:else if nav.screen === 'levels'}
				<LevelMap />
			{:else if nav.screen === 'play'}
				<PlayAd><Play {reduced} /></PlayAd>
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
