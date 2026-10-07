import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig } from 'vite';

// Deployment metadata that the app never requests.
const NOT_PRECACHED = new Set(['CNAME', '.nojekyll', 'service-worker.js']);

/**
 * Writes `service-worker.js` after the build. It lists every built file for
 * precaching and carries a hash of all of them as its version, so any change
 * to the app changes the worker and installed copies pick up the update.
 * @returns {import('vite').Plugin}
 */
function serviceWorker() {
	let outDir = '';
	let root = '';
	return {
		name: 'balls:service-worker',
		apply: 'build',
		configResolved(config) {
			root = config.root;
			outDir = path.resolve(config.root, config.build.outDir);
		},
		async closeBundle() {
			const entries = await readdir(outDir, { recursive: true, withFileTypes: true });
			const files = entries
				.filter((e) => e.isFile())
				.map((e) =>
					path.relative(outDir, path.join(e.parentPath, e.name)).split(path.sep).join('/')
				)
				.filter((f) => !NOT_PRECACHED.has(f))
				.sort();
			const template = await readFile(path.join(root, 'src/service-worker.js'), 'utf8');
			const hash = createHash('sha256').update(template);
			for (const file of files) hash.update(file).update(await readFile(path.join(outDir, file)));
			const version = hash.digest('hex').slice(0, 12);
			const assets = ['./', ...files.map((f) => `./${f}`)];
			const worker = template
				.replace("'__VERSION__'", JSON.stringify(version))
				.replace('[/* __ASSETS__ */]', JSON.stringify(assets, null, '\t'));
			await writeFile(path.join(outDir, 'service-worker.js'), worker);
		}
	};
}

export default defineConfig({
	base: './',
	plugins: [svelte(), serviceWorker()],
	worker: { format: 'es' },
	server: { port: 5420 },
	preview: { port: 4273 }
});
