import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default defineConfig(
	{
		ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', '.local/**']
	},
	js.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{ languageOptions: { globals: { ...globals.browser, ...globals.node } } },
	{ files: ['src/service-worker.js'], languageOptions: { globals: globals.serviceworker } }
);
