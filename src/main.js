import { mount } from 'svelte';
import fredoka from '@fontsource-variable/fredoka/files/fredoka-latin-wght-normal.woff2?url';
import './app.css';
import App from './App.svelte';
import { registerServiceWorker } from './lib/state/updates.svelte.js';

// Only the Latin subset is bundled, so the offline cache stays small.
const font = new FontFace('Fredoka', `url(${fredoka}) format('woff2')`, {
	weight: '300 700',
	display: 'swap'
});
document.fonts.add(font);
// If the font fails to load, text falls back to the system's rounded font.
font.load().catch(() => {});

registerServiceWorker();
mount(App, { target: /** @type {HTMLElement} */ (document.getElementById('app')) });
