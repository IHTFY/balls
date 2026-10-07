<script>
	import ArrowBigDown from '@lucide/svelte/icons/arrow-big-down';
	import { SvelteSet } from 'svelte/reactivity';
	import { computeLayout, slotCenter } from '../game/layout.js';
	import { burst, confetti, shimmer } from '../fx/particles.js';
	import Ball from './Ball.svelte';

	/**
	 * @type {{
	 *   game: import('../state/game.svelte.js').Game,
	 *   skin: import('../game/cosmetics.js').Skin,
	 *   symbols: boolean,
	 *   targets: boolean,
	 *   reduced: boolean,
	 *   pointer?: number,
	 *   onTap: (tube: number) => void
	 * }}
	 */
	let { game, skin, symbols, targets, reduced, pointer = -1, onTap } = $props();

	let width = $state(0);
	let height = $state(0);
	/** @type {HTMLDivElement} */
	let board;
	/** @type {HTMLButtonElement[]} */
	const tubeEls = [];

	const layout = $derived(computeLayout(game.tubes.length, game.capacity, width, height));
	// Any change that moves balls for reasons other than play skips the travel animation.
	const layoutKey = $derived(`${width}x${height}:${game.tubes.length}:${layout.ball}`);
	// A new start position (a new puzzle or a replay) drops the balls in again.
	const introKey = $derived(game.start);

	const lifted = $derived(game.selected >= 0 ? game.liftCount(game.selected) : 0);

	const balls = $derived.by(() => {
		const { tubes, ball, pad } = layout;
		const out = [];
		for (let t = 0; t < game.tubes.length; t++) {
			const box = tubes[t];
			const tube = game.tubes[t];
			const liftBy =
				t === game.selected
					? slotCenter(box, tube.length - 1, ball, pad).y - (box.y - ball * 0.62)
					: 0;
			for (let s = 0; s < tube.length; s++) {
				const center = slotCenter(box, s, ball, pad);
				const up = t === game.selected && s >= tube.length - lifted;
				out.push({
					ball: tube[s],
					tube: t,
					slot: s,
					x: center.x - ball / 2,
					y: center.y - ball / 2 - (up ? liftBy : 0),
					apex: box.y - ball * 1.12,
					order: tube.length - 1 - s,
					up
				});
			}
		}
		return out;
	});

	/**
	 * @typedef {{ x: number, y: number, apex: number, order: number, layout: string,
	 *   introDelay: number }} GlideParams
	 */

	/** @param {Element} node */
	function currentOffset(node) {
		const m = new DOMMatrixReadOnly(getComputedStyle(node).transform);
		return { x: m.m41, y: m.m42 };
	}

	/**
	 * Moves a ball along a lift, arc, and drop path whenever its target changes.
	 * @param {HTMLElement} node
	 * @param {GlideParams} params
	 */
	function glide(node, params) {
		let current = params;
		const at = (/** @type {number} */ x, /** @type {number} */ y) => `translate(${x}px, ${y}px)`;
		node.style.transform = at(params.x, params.y);
		if (!reduced) {
			node.animate(
				[
					{ transform: at(params.x, params.y - height - 80), opacity: 0 },
					{ transform: at(params.x, params.y), opacity: 1, offset: 0.75, easing: 'ease-out' },
					{
						transform: at(params.x, params.y - layout.ball * 0.18),
						offset: 0.88,
						easing: 'ease-in'
					},
					{ transform: at(params.x, params.y) }
				],
				{
					duration: 620,
					delay: params.introDelay,
					easing: 'cubic-bezier(.55,0,.8,.4)',
					fill: 'backwards'
				}
			);
		}
		return {
			/** @param {GlideParams} next */
			update(next) {
				const prev = current;
				current = next;
				if (next.x === prev.x && next.y === prev.y) return;
				if (next.layout !== prev.layout || reduced) {
					node.getAnimations().forEach((a) => a.cancel());
					node.style.transform = at(next.x, next.y);
					return;
				}
				const from = currentOffset(node);
				node.getAnimations().forEach((a) => a.cancel());
				node.style.transform = at(next.x, next.y);

				if (Math.abs(next.x - from.x) < 1) {
					const rising = next.y < from.y;
					node.animate([{ transform: at(from.x, from.y) }, { transform: at(next.x, next.y) }], {
						duration: rising ? 170 : 200,
						easing: rising ? 'cubic-bezier(.3,1.5,.6,1)' : 'cubic-bezier(.5,0,.8,.6)'
					});
					if (!rising) squash(node, 200);
					return;
				}
				// Rise to the arc height, glide across, then drop into place.
				const apex = Math.min(from.y, next.apex, prev.apex) - next.order * layout.ball * 0.9;
				const rise = from.y - apex;
				const across = Math.abs(next.x - from.x);
				const drop = next.y - apex;
				const total = rise + across + drop;
				const duration = Math.min(560, 200 + total * 0.45);
				node.animate(
					[
						{ transform: at(from.x, from.y), easing: 'ease-out' },
						{ transform: at(from.x, apex), offset: rise / total, easing: 'ease-in-out' },
						{
							transform: at(next.x, apex),
							offset: (rise + across) / total,
							easing: 'cubic-bezier(.5,0,.9,.6)'
						},
						{ transform: at(next.x, next.y) }
					],
					{ duration, delay: next.order * 45, fill: 'backwards' }
				);
				squash(node, duration + next.order * 45);
			}
		};
	}

	/** A little squash when a ball lands. */
	function squash(/** @type {HTMLElement} */ node, /** @type {number} */ delay) {
		node.firstElementChild?.animate(
			[
				{ transform: 'scale(1)' },
				{ transform: 'scale(1.14, 0.86) translateY(6%)' },
				{ transform: 'scale(0.96, 1.04)' },
				{ transform: 'scale(1)' }
			],
			{ duration: 260, delay, easing: 'ease-out' }
		);
	}

	/** @type {{ id: number, x: number, y: number, text: string, big: boolean }[]} */
	let floats = $state([]);
	let floatId = 0;
	const popped = new SvelteSet();

	/** @param {number} tube */
	function tubeRect(tube) {
		const box = layout.tubes[tube];
		const origin = board.getBoundingClientRect();
		return new DOMRect(origin.left + box.x, origin.top + box.y, box.w, box.h);
	}

	const PRAISE = ['Sorted!', 'Nice!', 'Great!', 'Superb!', 'Amazing!', 'Unstoppable!'];

	$effect(() =>
		game.on((event) => {
			if (event.type === 'invalid') {
				tubeEls[event.tube]?.animate(
					[
						{ transform: 'translateX(0)' },
						{ transform: 'translateX(-7px) rotate(-2deg)' },
						{ transform: 'translateX(6px) rotate(2deg)' },
						{ transform: 'translateX(-4px)' },
						{ transform: 'translateX(0)' }
					],
					{ duration: 300, easing: 'ease-out' }
				);
			} else if (event.type === 'complete') {
				const rect = tubeRect(event.tube);
				const color = skin.colors[event.color % skin.colors.length];
				setTimeout(
					() => {
						burst(
							rect.left + rect.width / 2,
							rect.top,
							[color, '#fff', color],
							event.combo > 1 ? 40 : 24
						);
						popped.add(event.tube);
						setTimeout(() => popped.delete(event.tube), 500);
					},
					reduced ? 0 : 380
				);
				const box = layout.tubes[event.tube];
				floats.push({
					id: floatId++,
					x: box.x + box.w / 2,
					y: box.y - layout.ball * 0.4,
					text:
						event.combo > 1
							? `Combo ×${event.combo}!`
							: PRAISE[Math.floor(Math.random() * PRAISE.length)],
					big: event.combo > 1
				});
			} else if (event.type === 'only') {
				const box = layout.tubes[event.to];
				floats.push({
					id: floatId++,
					x: box.x + box.w / 2,
					y: box.y - layout.ball * 0.9,
					text: 'Only move',
					big: false
				});
			} else if (event.type === 'reveal') {
				setTimeout(() => shimmer(tubeRect(event.tube), '#fff', 8), 250);
			} else if (event.type === 'win') {
				setTimeout(
					() => {
						confetti([...skin.colors.slice(0, 8), '#ffffff']);
						if (reduced) return;
						board.querySelectorAll('.ball-slot > :first-child').forEach((el, i) => {
							el.animate(
								[
									{ transform: 'translateY(0)' },
									{ transform: `translateY(-${layout.ball * 0.6}px) scale(1.05)` },
									{ transform: 'translateY(0) scale(1.1, 0.9)' },
									{ transform: 'translateY(0)' }
								],
								{ duration: 520, delay: 60 * (i % 24), easing: 'ease-in-out' }
							);
						});
					},
					reduced ? 0 : 450
				);
			}
		})
	);

	/** @param {number} i */
	function label(i) {
		const tube = game.tubes[i];
		if (!tube.length) return `Tube ${i + 1}, empty`;
		const names = tube.map((b) => (b.hidden ? 'hidden' : `color ${b.color + 1}`));
		return `Tube ${i + 1}, ${tube.length} of ${game.capacity}, top ${names[names.length - 1]}`;
	}
</script>

<div
	class="board"
	data-capacity={game.capacity}
	bind:this={board}
	bind:clientWidth={width}
	bind:clientHeight={height}
>
	{#if width > 0}
		{#key introKey}
			{#each game.tubes as tube, i (i)}
				{@const box = layout.tubes[i]}
				<button
					class="tube"
					class:selected={game.selected === i}
					class:target={targets && game.destinations.includes(i)}
					class:complete={game.isComplete(i)}
					class:popped={popped.has(i)}
					class:hint-from={game.hint?.from === i}
					class:hint-to={game.hint?.to === i}
					style:left="{box.x}px"
					style:top="{box.y}px"
					style:width="{box.w}px"
					style:height="{box.h}px"
					style:--ball="{layout.ball}px"
					style:--cap-color={game.isComplete(i)
						? skin.colors[tube[0].color % skin.colors.length]
						: 'transparent'}
					style:--delay="{i * 35}ms"
					data-tube={i}
					aria-label={label(i)}
					aria-pressed={game.selected === i}
					bind:this={tubeEls[i]}
					onclick={() => onTap(i)}
				>
					<span class="glass"></span>
					<span class="lid"></span>
					{#if i < 10}<span class="key" aria-hidden="true">{(i + 1) % 10}</span>{/if}
				</button>
				{#if game.hint?.to === i || pointer === i}
					<div
						class="arrow"
						class:hand={pointer === i}
						style:left="{box.x + box.w / 2}px"
						style:top="{box.y - layout.ball * 1.6}px"
						aria-hidden="true"
					>
						{#if pointer === i}<ArrowBigDown size={34} fill="currentColor" />{:else}▼{/if}
					</div>
				{/if}
			{/each}
			{#each balls as b (b.ball.id)}
				<div
					class="ball-slot"
					class:up={b.up}
					data-in={b.tube}
					data-slot={b.slot}
					use:glide={{
						x: b.x,
						y: b.y,
						apex: b.apex,
						order: b.up ? b.order : 0,
						layout: layoutKey,
						introDelay: b.tube * 45 + b.slot * 70
					}}
				>
					<Ball color={b.ball.color} hidden={b.ball.hidden} {skin} {symbols} size={layout.ball} />
				</div>
			{/each}
		{/key}
		{#each floats as f (f.id)}
			<div
				class="float"
				class:big={f.big}
				style:left="{f.x}px"
				style:top="{f.y}px"
				onanimationend={() => (floats = floats.filter((x) => x.id !== f.id))}
			>
				{f.text}
			</div>
		{/each}
	{/if}
</div>

<style>
	.board {
		position: relative;
		width: 100%;
		height: 100%;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}
	.tube {
		position: absolute;
		padding: 0;
		margin: 0;
		border: none;
		background: none;
		cursor: pointer;
		border-radius: calc(var(--ball) * 0.2) calc(var(--ball) * 0.2) calc(var(--ball) * 0.65)
			calc(var(--ball) * 0.65);
		transition: transform 0.2s cubic-bezier(0.3, 1.5, 0.6, 1);
		animation: tube-in 0.5s var(--delay) cubic-bezier(0.3, 1.4, 0.6, 1) backwards;
	}
	.tube:focus-visible {
		outline: 3px solid var(--accent);
		outline-offset: 4px;
	}
	.glass {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		border: max(2px, calc(var(--ball) * 0.05)) solid var(--glass-edge);
		border-top: none;
		background:
			linear-gradient(
				90deg,
				transparent 12%,
				rgb(255 255 255 / 0.22) 18%,
				transparent 26%,
				transparent 76%,
				rgb(255 255 255 / 0.1) 82%,
				transparent 88%
			),
			var(--glass);
		box-shadow: inset 0 calc(var(--ball) * -0.1) calc(var(--ball) * 0.3) rgb(0 0 0 / 0.15);
		transition:
			box-shadow 0.3s,
			border-color 0.3s;
	}
	.glass::before {
		/* The tube's rim. */
		content: '';
		position: absolute;
		left: calc(var(--ball) * -0.1);
		right: calc(var(--ball) * -0.1);
		top: calc(var(--ball) * -0.06);
		height: calc(var(--ball) * 0.12);
		border-radius: calc(var(--ball) * 0.1);
		background: var(--glass-edge);
	}
	.selected {
		transform: translateY(calc(var(--ball) * -0.08));
	}
	.selected .glass {
		border-color: var(--accent);
		box-shadow:
			0 0 calc(var(--ball) * 0.35) color-mix(in srgb, var(--accent), transparent 50%),
			inset 0 0 calc(var(--ball) * 0.3) color-mix(in srgb, var(--accent), transparent 75%);
	}
	.target .glass {
		border-color: color-mix(in srgb, var(--accent-2), transparent 15%);
		box-shadow:
			0 0 calc(var(--ball) * 0.3) color-mix(in srgb, var(--accent-2), transparent 55%),
			inset 0 0 calc(var(--ball) * 0.25) color-mix(in srgb, var(--accent-2), transparent 80%);
	}
	.complete .glass {
		border-color: var(--cap-color);
		box-shadow:
			0 0 calc(var(--ball) * 0.4) color-mix(in srgb, var(--cap-color), transparent 45%),
			inset 0 0 calc(var(--ball) * 0.4) color-mix(in srgb, var(--cap-color), transparent 70%);
	}
	.lid {
		position: absolute;
		left: calc(var(--ball) * -0.14);
		right: calc(var(--ball) * -0.14);
		top: calc(var(--ball) * -0.22);
		height: calc(var(--ball) * 0.26);
		border-radius: calc(var(--ball) * 0.12);
		background: linear-gradient(
			180deg,
			color-mix(in oklab, var(--cap-color), #fff 35%),
			var(--cap-color) 60%,
			color-mix(in oklab, var(--cap-color), #000 30%)
		);
		box-shadow: 0 2px 6px rgb(0 0 0 / 0.35);
		opacity: 0;
		transform: translateY(calc(var(--ball) * -0.8)) scaleX(0.6);
		transition:
			opacity 0.2s,
			transform 0.35s cubic-bezier(0.3, 1.6, 0.6, 1);
		pointer-events: none;
	}
	.complete .lid {
		opacity: 1;
		transform: none;
		transition-delay: 0.35s;
	}
	.popped {
		animation: pop 0.45s ease-out;
	}
	.hint-from .glass,
	.hint-to .glass {
		border-color: var(--accent-2);
		animation: hint-glow 0.9s ease-in-out infinite alternate;
	}
	.key {
		position: absolute;
		left: 50%;
		bottom: calc(var(--ball) * -0.55);
		transform: translateX(-50%);
		font-size: max(10px, calc(var(--ball) * 0.22));
		color: var(--muted);
		opacity: 0;
		transition: opacity 0.2s;
	}
	@media (hover: hover) and (pointer: fine) {
		.board:hover .key {
			opacity: 0.6;
		}
	}
	.ball-slot {
		position: absolute;
		left: 0;
		top: 0;
		pointer-events: none;
		will-change: transform;
	}
	.ball-slot.up > :global(:first-child) {
		animation: hover 1.2s ease-in-out 0.2s infinite alternate;
	}
	.arrow {
		position: absolute;
		transform: translateX(-50%);
		color: var(--accent-2);
		font-size: 22px;
		pointer-events: none;
		text-shadow: 0 0 10px var(--accent-2);
		animation: bob 0.7s ease-in-out infinite alternate;
		z-index: 2;
	}
	.arrow.hand {
		line-height: 0;
		text-shadow: none;
		filter: drop-shadow(0 0 8px var(--accent-2));
	}
	.float {
		position: absolute;
		transform: translate(-50%, -50%);
		font-family: var(--display);
		font-weight: 700;
		font-size: 18px;
		color: #fff;
		text-shadow:
			0 2px 0 rgb(0 0 0 / 0.35),
			0 0 12px var(--accent);
		white-space: nowrap;
		pointer-events: none;
		animation: float-up 1.1s ease-out forwards;
		z-index: 3;
	}
	.float.big {
		font-size: 26px;
		color: var(--accent);
	}
	@keyframes tube-in {
		from {
			opacity: 0;
			transform: translateY(40px) scale(0.9);
		}
	}
	@keyframes pop {
		40% {
			transform: scale(1.08, 0.94);
		}
		70% {
			transform: scale(0.97, 1.03);
		}
	}
	@keyframes hint-glow {
		from {
			box-shadow: 0 0 4px var(--accent-2);
		}
		to {
			box-shadow: 0 0 22px var(--accent-2);
		}
	}
	@keyframes bob {
		to {
			transform: translate(-50%, 8px);
		}
	}
	@keyframes hover {
		to {
			transform: translateY(-4px);
		}
	}
	@keyframes float-up {
		0% {
			opacity: 0;
			transform: translate(-50%, -20%) scale(0.6);
		}
		20% {
			opacity: 1;
			transform: translate(-50%, -60%) scale(1.1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -260%) scale(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.tube,
		.popped,
		.ball-slot.up > :global(:first-child) {
			animation: none;
		}
	}
	:global(.reduced) .tube,
	:global(.reduced) .ball-slot.up > :global(:first-child),
	:global(.reduced) .arrow {
		animation: none;
	}
</style>
