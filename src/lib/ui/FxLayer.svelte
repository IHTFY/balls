<script>
	import { attachCanvas } from '../fx/particles.js';

	/** @type {HTMLCanvasElement} */
	let canvas;
	$effect(() => attachCanvas(canvas));
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
	canvas {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 70;
	}
</style>
