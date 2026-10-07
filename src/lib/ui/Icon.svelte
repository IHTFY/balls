<script>
	import { ICONS } from './icons.js';

	/** @type {{ name: import('./icons.js').IconName, size?: number }} */
	let { name, size = 24 } = $props();

	const Glyph = $derived(ICONS[name]);
</script>

<Glyph {size} />
