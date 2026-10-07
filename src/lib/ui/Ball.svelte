<script>
	import { SYMBOLS } from '../game/cosmetics.js';

	/** @type {{ color: number, hidden?: boolean, skin: import('../game/cosmetics.js').Skin, symbols?: boolean, size: number }} */
	let { color, hidden = false, skin, symbols = false, size } = $props();

	const fill = $derived(skin.colors[color % skin.colors.length]);
	const striped = $derived(skin.style === 'billiard' && color >= 7);
</script>

<div
	class="ball {hidden ? 'hidden' : skin.style}"
	class:striped
	style:--c={fill}
	style:--size="{size}px"
	data-color={hidden ? undefined : color}
>
	{#if hidden}
		<span class="glyph">?</span>
	{:else if skin.style === 'emoji'}
		<span class="emoji">{skin.emoji?.[color]}</span>
	{:else if skin.style === 'billiard'}
		<span class="number">{color + 1}</span>
	{/if}
	{#if symbols && !hidden && skin.style !== 'emoji' && skin.style !== 'billiard'}
		<span class="symbol">{SYMBOLS[color]}&#xFE0E;</span>
	{/if}
</div>

<style>
	.ball {
		position: relative;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: calc(var(--size) * 0.42);
		font-weight: 700;
		line-height: 1;
		user-select: none;
	}
	.ball > span {
		grid-area: 1 / 1;
	}
	.glossy {
		background: radial-gradient(
			circle at 34% 28%,
			#fff 0 5%,
			color-mix(in oklab, var(--c), #fff 45%) 13%,
			var(--c) 48%,
			color-mix(in oklab, var(--c), #000 48%) 100%
		);
		box-shadow:
			inset 0 calc(var(--size) * -0.06) calc(var(--size) * 0.12) rgb(0 0 0 / 0.22),
			0 calc(var(--size) * 0.06) calc(var(--size) * 0.12) rgb(0 0 0 / 0.3);
	}
	.matte {
		background: radial-gradient(
			circle at 40% 35%,
			color-mix(in oklab, var(--c), #fff 30%),
			var(--c) 60%,
			color-mix(in oklab, var(--c), #000 12%)
		);
		box-shadow: 0 calc(var(--size) * 0.05) calc(var(--size) * 0.1) rgb(0 0 0 / 0.18);
	}
	.neon {
		background: radial-gradient(
			circle at 40% 35%,
			color-mix(in oklab, var(--c), #000 55%),
			color-mix(in oklab, var(--c), #000 80%) 70%
		);
		border: calc(var(--size) * 0.09) solid var(--c);
		box-shadow:
			0 0 calc(var(--size) * 0.28) var(--c),
			inset 0 0 calc(var(--size) * 0.22) var(--c);
	}
	.gem {
		border-radius: 0;
		clip-path: polygon(50% 2%, 92% 26%, 92% 74%, 50% 98%, 8% 74%, 8% 26%);
		background:
			linear-gradient(150deg, rgb(255 255 255 / 0.55) 0 22%, transparent 23%),
			conic-gradient(
				from 30deg,
				color-mix(in oklab, var(--c), #fff 50%),
				var(--c) 60deg,
				color-mix(in oklab, var(--c), #000 40%) 120deg,
				var(--c) 180deg,
				color-mix(in oklab, var(--c), #fff 25%) 240deg,
				color-mix(in oklab, var(--c), #000 25%) 300deg,
				color-mix(in oklab, var(--c), #fff 50%)
			);
	}
	.marble {
		background:
			radial-gradient(circle at 33% 28%, rgb(255 255 255 / 0.95) 0 4%, transparent 11%),
			radial-gradient(circle at 50% 50%, transparent 55%, rgb(0 0 0 / 0.35) 100%),
			conic-gradient(
				from 200deg at 58% 62%,
				var(--c),
				color-mix(in oklab, var(--c), #fff 70%) 15%,
				var(--c) 30%,
				color-mix(in oklab, var(--c), #000 35%) 55%,
				color-mix(in oklab, var(--c), #fff 50%) 75%,
				var(--c)
			);
		box-shadow: 0 calc(var(--size) * 0.06) calc(var(--size) * 0.12) rgb(0 0 0 / 0.3);
	}
	.billiard {
		background:
			radial-gradient(circle at 34% 26%, rgb(255 255 255 / 0.9) 0 4%, transparent 12%),
			radial-gradient(circle at 50% 50%, transparent 50%, rgb(0 0 0 / 0.35) 100%), var(--c);
		box-shadow: 0 calc(var(--size) * 0.06) calc(var(--size) * 0.12) rgb(0 0 0 / 0.35);
	}
	.billiard.striped {
		background:
			radial-gradient(circle at 34% 26%, rgb(255 255 255 / 0.9) 0 4%, transparent 12%),
			radial-gradient(circle at 50% 50%, transparent 50%, rgb(0 0 0 / 0.35) 100%),
			linear-gradient(#f4f1ea 0 22%, var(--c) 22% 78%, #f4f1ea 78%);
	}
	.number {
		display: grid;
		place-items: center;
		width: 52%;
		height: 52%;
		border-radius: 50%;
		background: #fbf8f0;
		color: #141414;
		font-size: calc(var(--size) * 0.28);
		font-weight: 800;
	}
	.emoji {
		background: radial-gradient(
			circle at 40% 35%,
			color-mix(in oklab, var(--c), #fff 60%),
			color-mix(in oklab, var(--c), #fff 15%)
		);
		box-shadow:
			inset 0 calc(var(--size) * -0.06) calc(var(--size) * 0.1) rgb(0 0 0 / 0.15),
			0 calc(var(--size) * 0.05) calc(var(--size) * 0.1) rgb(0 0 0 / 0.25);
	}
	.emoji > span {
		font-size: calc(var(--size) * 0.62);
	}
	.hidden {
		background: radial-gradient(circle at 34% 28%, #9a9aa8 0 5%, #4b4b5a 30%, #17171f 100%);
		box-shadow: 0 calc(var(--size) * 0.06) calc(var(--size) * 0.12) rgb(0 0 0 / 0.35);
		color: rgb(255 255 255 / 0.75);
	}
	.symbol {
		color: rgb(255 255 255 / 0.92);
		font-size: calc(var(--size) * 0.44);
		text-shadow:
			0 0 2px rgb(0 0 0 / 0.9),
			0 0 4px rgb(0 0 0 / 0.6);
	}
</style>
