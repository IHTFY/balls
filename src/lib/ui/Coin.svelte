<script>
	/** @type {{ size?: number }} */
	let { size = 18 } = $props();
</script>

<svg class="coin" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
	<circle cx="12" cy="12" r="11" fill="#e0a000" />
	<circle cx="12" cy="12" r="9.5" fill="#ffcf3f" />
	<circle cx="12" cy="12" r="6.5" fill="none" stroke="#e0a000" stroke-width="1.6" />
	<path
		d="M7 6.5a7 7 0 0 1 6-2"
		fill="none"
		stroke="#fff6c8"
		stroke-width="1.6"
		stroke-linecap="round"
	/>
</svg>

<style>
	.coin {
		flex: none;
		vertical-align: -0.15em;
	}
</style>
