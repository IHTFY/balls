import { registerHooks } from 'node:module';
import { compileModule } from 'svelte/compiler';

registerHooks({
	load(url, context, nextLoad) {
		const result = nextLoad(url, context);
		if (!url.includes('/src/') || !url.endsWith('.svelte.js')) return result;
		return {
			...result,
			source: compileModule(String(result.source), {
				filename: new URL(url).pathname,
				generate: 'client',
				dev: false
			}).js.code
		};
	}
});
Object.defineProperty(globalThis, 'window', { value: new EventTarget(), configurable: true });
/** @type {Map<string, string>} */
const values = new Map();
Object.defineProperty(globalThis, 'localStorage', {
	value: {
		getItem: (/** @type {string} */ key) => values.get(key) ?? null,
		setItem: (/** @type {string} */ key, /** @type {string} */ value) =>
			values.set(key, String(value)),
		removeItem: (/** @type {string} */ key) => values.delete(key)
	},
	configurable: true
});
