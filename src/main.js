import { mount } from 'svelte';
import exoNormal from '@fontsource-variable/exo-2/files/exo-2-latin-wght-normal.woff2?url';
import exoItalic from '@fontsource-variable/exo-2/files/exo-2-latin-wght-italic.woff2?url';
import './app.css';
import App from './App.svelte';
import { loadForBuyer } from './lib/ads.js';
import { registerServiceWorker } from './lib/state/updates.svelte.js';

// Only the Latin subset is bundled, so the offline cache stays small. Titles use the
// italic cut under a family of their own, so `font-family: var(--display)` is enough.
const fonts = [
	new FontFace('Exo 2', `url(${exoNormal}) format('woff2')`, {
		weight: '100 900',
		display: 'swap'
	}),
	new FontFace('Balls Display', `url(${exoItalic}) format('woff2')`, {
		weight: '100 900',
		display: 'swap'
	})
];
for (const font of fonts) {
	document.fonts.add(font);
	// If a font fails to load, text falls back to the system sans.
	font.load().catch(() => {});
}

registerServiceWorker();
loadForBuyer();
mount(App, { target: /** @type {HTMLElement} */ (document.getElementById('app')) });
