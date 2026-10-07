<script>
	import { untrack } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import House from '@lucide/svelte/icons/house';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import Plus from '@lucide/svelte/icons/plus';
	import Settings from '@lucide/svelte/icons/settings';
	import { skinById } from '../game/cosmetics.js';
	import { clock } from '../game/format.js';
	import { starsFor } from '../game/scoring.js';
	import { sound } from '../fx/audio.js';
	import { buzz } from '../fx/haptics.js';
	import { go, nav } from '../state/nav.svelte.js';
	import { profile } from '../state/profile.svelte.js';
	import { notify } from '../state/toasts.svelte.js';
	import { search } from '../puzzles.js';
	import {
		addTube,
		checkDeadEnd,
		finish,
		game,
		HINT_PRICE,
		MAX_ADDED_TUBES,
		next,
		replay,
		requestHint,
		save,
		session,
		subtitle,
		tick,
		title,
		TUBE_PRICE
	} from '../state/session.svelte.js';
	import Board from './Board.svelte';
	import CoinChip from './CoinChip.svelte';
	import WinDialog from './WinDialog.svelte';

	/** @type {{ reduced: boolean }} */
	let { reduced } = $props();

	const skin = $derived(skinById(profile.skin));
	const liveStars = $derived(starsFor(game.moves, game.par));
	const blitz = $derived(session.mode === 'blitz');
	let showResult = $state(false);

	$effect(() => {
		if (!session.result) {
			showResult = false;
			return;
		}
		const timer = setTimeout(
			() => (showResult = true),
			session.result.mode === 'blitz' ? 300 : 1300
		);
		return () => clearTimeout(timer);
	});

	$effect(() =>
		game.on((e) => {
			if (e.type === 'select') {
				const tube = game.tubes[e.tube];
				sound.pick(tube[tube.length - 1].color);
				buzz(8);
			} else if (e.type === 'deselect') sound.tap();
			else if (e.type === 'invalid') {
				sound.invalid();
				buzz([15, 40, 15]);
			} else if (e.type === 'move') {
				e.balls.forEach((b, i) => setTimeout(() => sound.drop(b.color, i), reduced ? 0 : 230));
				buzz(10);
				save();
				checkDeadEnd();
			} else if (e.type === 'complete') {
				setTimeout(() => sound.complete(e.combo), reduced ? 0 : 330);
				buzz(e.combo > 1 ? [20, 30, 40] : 25);
				profile.stats.tubesCompleted++;
			} else if (e.type === 'reveal') sound.reveal();
			else if (e.type === 'win') {
				setTimeout(() => sound.win(), reduced ? 0 : 420);
				buzz([30, 60, 30, 60, 90]);
				if (session.mode === 'level' && session.level === 1) profile.tutorialDone = true;
				finish();
			} else if (e.type === 'undo') {
				sound.undo();
				profile.stats.undos++;
				save();
			} else if (e.type === 'restart') {
				sound.whoosh();
				save();
			} else if (e.type === 'addTube') sound.buy();
		})
	);

	$effect(() => {
		const timer = setInterval(() => {
			if (document.visibilityState === 'visible' && !nav.dialog) {
				tick();
				if (blitz && session.blitz.left <= 10 && session.blitz.left > 0) sound.tick();
			}
		}, 1000);
		return () => clearInterval(timer);
	});

	// First-time coaching on level 1: point at the next tube to tap.
	const coaching = $derived(
		session.mode === 'level' && session.level === 1 && !profile.tutorialDone
	);
	/** @type {[number, number] | null} */
	let coachMove = $state(null);
	$effect(() => {
		if (!coaching || session.loading || game.won) {
			coachMove = null;
			return;
		}
		const version = game.version;
		search(game.colorTubes, game.capacity, { weight: 1, maxNodes: 5000 }).then((r) => {
			if (version === game.version) coachMove = r.moves?.[0] ?? null;
		});
	});
	const pointer = $derived(
		coachMove ? (game.selected === coachMove[0] ? coachMove[1] : coachMove[0]) : -1
	);

	// A short card announcing a level's twist as the board drops in.
	/** @type {{ icon: string, title: string, text: string } | null} */
	let intro = $state(null);
	$effect(() => {
		if (session.loading || !game.start.length) return;
		const card = untrack(() => {
			if (game.moves > 0) return null;
			if (session.mode === 'daily')
				return { icon: '📅', title: 'Daily Challenge', text: 'The same puzzle for everyone today' };
			if (session.boss)
				return { icon: '👑', title: 'Boss level', text: 'A big board for double points' };
			if (session.mystery)
				return { icon: '🔮', title: 'Mystery', text: 'Balls stay hidden until you uncover them' };
			if (game.capacity === 5 && session.mode === 'level')
				return { icon: '📏', title: 'Tall tubes', text: 'Five balls to a tube' };
			return null;
		});
		intro = card;
		if (!card) return;
		const timer = setTimeout(() => (intro = null), 1900);
		return () => clearTimeout(timer);
	});

	async function hint() {
		const outcome = await requestHint();
		if (outcome === 'ok') sound.hint();
		else if (outcome === 'empty')
			notify({ icon: '🪙', title: 'Not enough coins', body: `A hint costs ${HINT_PRICE} coins` });
		else if (outcome === 'deadEnd')
			notify({ icon: '🧱', title: 'Dead end', body: 'Undo a few moves to find a way out' });
		else if (outcome === 'unknown')
			notify({ icon: '🤔', title: 'Too tangled to tell', body: 'Try a few more moves first' });
	}

	function tube() {
		const outcome = addTube();
		if (outcome === 'empty')
			notify({
				icon: '🪙',
				title: 'Not enough coins',
				body: `An extra tube costs ${TUBE_PRICE} coins`
			});
		else if (outcome === 'max')
			notify({
				icon: '🧪',
				title: 'That’s plenty',
				body: `Up to ${MAX_ADDED_TUBES} extra tubes per puzzle`
			});
	}

	function undo() {
		if (!game.undo()) sound.invalid();
	}

	/** @param {KeyboardEvent} e */
	function onKey(e) {
		if (nav.dialog || session.result || e.metaKey || e.altKey) return;
		const key = e.key.toLowerCase();
		if (e.ctrlKey && key !== 'z') return;
		if (/^[0-9]$/.test(key)) {
			const i = (Number(key) + 9) % 10;
			if (i < game.tubes.length) game.tap(i);
		} else if (['z', 'u', 'backspace'].includes(key)) undo();
		else if (key === 'r') game.restart();
		else if (key === 'h' && !blitz) hint();
		else if (key === 'escape' && game.selected >= 0) game.tap(game.selected);
		else return;
		e.preventDefault();
	}
</script>

<svelte:window onkeydown={onKey} />

<section
	class="play"
	class:boss={session.boss}
	data-state={session.loading ? 'loading' : game.won ? 'won' : 'playing'}
>
	<header class="hud">
		<button class="icon-button" aria-label="Home" onclick={() => go('home')}
			><House size={22} /></button
		>
		<div class="title">
			<h1>{title()}</h1>
			<div class="tags">
				{#if subtitle()}<span>{subtitle()}</span>{/if}
				{#if session.boss}<span class="tag boss-tag">👑 Boss</span>{/if}
				{#if session.mystery}<span class="tag">🔮 Mystery</span>{/if}
				{#if game.capacity === 5}<span class="tag">📏 Tall</span>{/if}
			</div>
		</div>
		<CoinChip />
	</header>

	{#if blitz}
		<div class="stats blitz-stats">
			<div class="blitz-clock" class:hurry={session.blitz.left <= 10}>
				⏱ {clock(session.blitz.left)}
			</div>
			<div><small>Solved</small><strong>{session.blitz.solved}</strong></div>
			<div><small>Score</small><strong>{session.blitz.score.toLocaleString()}</strong></div>
		</div>
	{:else}
		<div class="stats">
			<div><small>Moves</small><strong>{game.moves}</strong></div>
			<div class="meter" title="Par {game.par}" aria-label="{liveStars} stars at this pace">
				{#each [1, 2, 3] as n (n)}
					<span class="star" class:lit={liveStars >= n}>★</span>
				{/each}
				<small>Par {game.par}</small>
			</div>
			<div><small>Time</small><strong>{clock(game.seconds)}</strong></div>
		</div>
	{/if}

	<div class="board-wrap">
		{#if session.loading}
			<div class="loading" transition:fade={{ duration: 150 }}>
				<div class="spinner"></div>
				<p>Mixing balls…</p>
			</div>
		{:else}
			<Board
				{game}
				{skin}
				symbols={profile.settings.symbols}
				{reduced}
				{pointer}
				onTap={(i) => game.tap(i)}
			/>
		{/if}
		{#if coaching && !session.loading && !game.won}
			<p class="coach" in:fly={{ y: 20, duration: 300 }}>
				{game.selected < 0
					? 'Tap a tube to pick up its top ball'
					: 'Now drop it on the same color, or into an empty tube'}
			</p>
		{/if}
		{#if intro}
			<div
				class="intro"
				class:boss-intro={session.boss}
				in:scale={{ start: 0.6, duration: 450, easing: backOut }}
				out:fade={{ duration: 300 }}
			>
				<span>{intro.icon}</span>
				<b>{intro.title}</b>
				<small>{intro.text}</small>
			</div>
		{/if}
		{#if blitz && session.blitz.lastGain && game.won}
			<div class="gain" in:fly={{ y: 30, duration: 400, easing: backOut }}>
				+{session.blitz.lastGain.toLocaleString()}
			</div>
		{/if}
	</div>

	{#if (game.deadEnd || game.stuck) && !game.won && !session.loading}
		<div class="stuck" role="alert" transition:fly={{ y: 40, duration: 300, easing: backOut }}>
			<strong>{game.stuck ? 'No moves left!' : 'Dead end ahead'}</strong>
			<span
				>{game.stuck
					? 'Undo, restart, or add a tube.'
					: 'This position can’t be solved. Try undoing.'}</span
			>
		</div>
	{/if}

	<nav class="toolbar">
		<button class="tool" onclick={undo} disabled={!game.history.length || game.won}>
			<Undo2 size={22} /><span>Undo</span>
		</button>
		<button class="tool" onclick={() => game.restart()} disabled={!game.history.length || game.won}>
			<RotateCcw size={22} /><span>Restart</span>
		</button>
		{#if !blitz}
			<button
				class="tool"
				onclick={hint}
				disabled={session.hintBusy || game.won}
				aria-label={profile.hints > 0
					? `Hint, ${profile.hints} left`
					: `Hint for ${HINT_PRICE} coins`}
			>
				<Lightbulb size={22} /><span>Hint</span>
				<b class="badge" class:price={profile.hints <= 0}
					>{profile.hints > 0 ? profile.hints : `🪙${HINT_PRICE}`}</b
				>
			</button>
			<button
				class="tool"
				onclick={tube}
				disabled={game.won || game.tubesAdded >= MAX_ADDED_TUBES}
				aria-label={profile.tubes > 0
					? `Add tube, ${profile.tubes} left`
					: `Add tube for ${TUBE_PRICE} coins`}
			>
				<Plus size={22} /><span>Tube</span>
				<b class="badge" class:price={profile.tubes <= 0}
					>{profile.tubes > 0 ? profile.tubes : `🪙${TUBE_PRICE}`}</b
				>
			</button>
		{/if}
		<button class="tool" onclick={() => (nav.dialog = 'settings')}>
			<Settings size={22} /><span>Settings</span>
		</button>
	</nav>
</section>

{#if showResult && session.result}
	<WinDialog
		result={session.result}
		onnext={() => {
			sound.tap();
			next();
		}}
		onreplay={() => {
			sound.tap();
			replay();
		}}
		onhome={() => go(session.mode === 'level' ? 'levels' : 'home')}
	/>
{/if}

<style>
	.play {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-rows: auto auto 1fr auto;
		height: 100%;
		max-width: 1100px;
		margin: 0 auto;
		padding: calc(8px + env(safe-area-inset-top)) 12px calc(8px + env(safe-area-inset-bottom));
	}
	.hud {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 8px;
	}
	.title {
		text-align: center;
		min-width: 0;
	}
	h1 {
		margin: 0;
		font-family: var(--display);
		font-size: clamp(20px, 5vw, 28px);
		line-height: 1.1;
	}
	.tags {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 6px;
		font-size: 12px;
		color: var(--muted);
	}
	.tag {
		padding: 0 8px;
		border-radius: 999px;
		background: var(--surface-strong);
		color: var(--text);
	}
	.boss-tag {
		background: linear-gradient(90deg, #ffcf3f, #ff8a1f);
		color: #3a1d00;
		font-weight: 700;
	}
	.stats {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 8px;
		margin: 8px auto 0;
		padding: 6px 16px;
		width: min(420px, 100%);
		border-radius: 18px;
		background: var(--surface);
	}
	.stats > div {
		display: grid;
		text-align: center;
	}
	.stats small {
		color: var(--muted);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.stats strong {
		font-size: 20px;
		font-variant-numeric: tabular-nums;
	}
	.meter {
		display: flex !important;
		align-items: center;
		gap: 2px;
		flex-wrap: wrap;
		justify-content: center;
		width: 110px;
	}
	.meter small {
		width: 100%;
	}
	.star {
		font-size: 22px;
		color: var(--surface-strong);
		transition:
			color 0.3s,
			transform 0.3s;
	}
	.star.lit {
		color: #ffcf3f;
		text-shadow: 0 0 10px rgb(255 207 63 / 0.6);
	}
	.blitz-clock {
		font-size: 26px;
		font-weight: 700;
		font-family: var(--display);
	}
	.blitz-clock.hurry {
		color: #ff4d5e;
		animation: pulse 0.5s ease-in-out infinite alternate;
	}
	.board-wrap {
		position: relative;
		min-height: 0;
		margin: 4px 0;
	}
	.loading {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 12px;
		color: var(--muted);
	}
	.spinner {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 5px solid var(--surface-strong);
		border-top-color: var(--accent);
		animation: spin 0.8s linear infinite;
	}
	.coach {
		position: absolute;
		left: 50%;
		bottom: 8px;
		transform: translateX(-50%);
		margin: 0;
		width: max-content;
		max-width: calc(100% - 16px);
		padding: 8px 16px;
		border-radius: 18px;
		background: var(--panel);
		border: 1px solid var(--surface-strong);
		text-align: center;
		font-weight: 600;
		box-shadow: 0 8px 20px rgb(0 0 0 / 0.25);
	}
	.intro {
		position: absolute;
		left: 50%;
		top: 40%;
		translate: -50% -50%;
		display: grid;
		justify-items: center;
		gap: 2px;
		padding: 16px 28px;
		border-radius: 24px;
		background: var(--panel);
		border: 1px solid var(--surface-strong);
		box-shadow: 0 20px 50px rgb(0 0 0 / 0.4);
		pointer-events: none;
		z-index: 4;
		text-align: center;
	}
	.intro span {
		font-size: 44px;
	}
	.intro b {
		font-family: var(--display);
		font-size: 26px;
	}
	.intro small {
		color: var(--muted);
	}
	.boss-intro {
		border-color: #ffcf3f;
		box-shadow:
			0 0 40px rgb(255 207 63 / 0.35),
			0 20px 50px rgb(0 0 0 / 0.4);
	}
	.gain {
		position: absolute;
		left: 50%;
		top: 30%;
		transform: translateX(-50%);
		font-family: var(--display);
		font-size: 44px;
		font-weight: 700;
		color: var(--accent);
		text-shadow: 0 4px 20px rgb(0 0 0 / 0.4);
		pointer-events: none;
	}
	.stuck {
		position: absolute;
		left: 50%;
		bottom: calc(86px + env(safe-area-inset-bottom));
		transform: translateX(-50%);
		display: grid;
		text-align: center;
		gap: 2px;
		padding: 10px 18px;
		border-radius: 18px;
		background: linear-gradient(135deg, #ff5f6d, #c2366b);
		color: #fff;
		box-shadow: 0 10px 30px rgb(194 54 107 / 0.45);
		width: max-content;
		max-width: calc(100% - 24px);
		z-index: 5;
	}
	.toolbar {
		display: flex;
		justify-content: center;
		gap: 6px;
	}
	.tool {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 2px;
		min-width: 64px;
		padding: 8px 10px;
		border-radius: 16px;
		background: var(--surface);
		color: var(--text);
		font-size: 12px;
		font-weight: 600;
	}
	.tool:not(:disabled):hover {
		background: var(--surface-strong);
	}
	.tool:disabled {
		opacity: 0.4;
	}
	.badge {
		position: absolute;
		top: -6px;
		right: -4px;
		min-width: 20px;
		padding: 1px 6px;
		border-radius: 999px;
		background: var(--accent-2);
		color: #fff;
		font-size: 11px;
	}
	.badge.price {
		background: var(--accent);
		color: #2b1d00;
	}
	@media (max-height: 520px) {
		.play {
			grid-template-columns: 1fr auto;
			grid-template-rows: auto 1fr;
			column-gap: 12px;
		}
		.hud {
			grid-row: 1;
			grid-column: 1 / -1;
		}
		.title {
			text-align: left;
		}
		.tags {
			justify-content: flex-start;
		}
		.stats {
			grid-row: 1;
			grid-column: 1 / -1;
			justify-self: center;
			margin: 0;
			width: auto;
			padding: 2px 14px;
			gap: 14px;
			z-index: 1;
		}
		.stats strong {
			font-size: 16px;
		}
		.board-wrap {
			grid-row: 2;
			grid-column: 1;
		}
		.toolbar {
			grid-row: 2;
			grid-column: 2;
			flex-direction: column;
			justify-content: center;
		}
		.tool {
			min-width: 56px;
			padding: 6px;
		}
		.tool span {
			display: none;
		}
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes pulse {
		to {
			transform: scale(1.08);
		}
	}
</style>
