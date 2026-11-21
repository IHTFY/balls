import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('the policy allows each inline script by its hash', () => {
	const policy = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/)?.[1] ?? '';
	const scriptSrc = policy.split(';').find((d) => d.trim().startsWith('script-src')) ?? '';
	const inline = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
		.filter((m) => !/\ssrc=/.test(m[1]))
		// The HTML parser turns CRLF into LF before the browser hashes a script.
		.map((m) => m[2].replaceAll('\r\n', '\n'));
	assert.ok(inline.length > 0);
	for (const body of inline) {
		const hash = createHash('sha256').update(body).digest('base64');
		assert.ok(scriptSrc.includes(`'sha256-${hash}'`), `script-src lacks 'sha256-${hash}'`);
	}
});
