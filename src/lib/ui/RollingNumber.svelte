<script>
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	/** @type {{ value: number, start?: number, duration?: number }} */
	let { value, start, duration = 700 } = $props();

	/** Starts at `start` (default: the first value) and animates every change. */
	const tween = new Tween(
		untrack(() => start ?? value),
		{ easing: cubicOut }
	);
	$effect(() => {
		tween.set(value, { duration });
	});
</script>

<span class="rolling">{Math.round(tween.current).toLocaleString()}</span>

<style>
	.rolling {
		font-variant-numeric: tabular-nums;
	}
</style>
