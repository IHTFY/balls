// Renders the app icons from one SVG: `pnpm icons`.
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const out = new URL('../public/icons/', import.meta.url);

/** A glass tube holding three glossy balls, scaled about the center. */
const art = (/** @type {number} */ scale) => `
	<g transform="translate(256 262) scale(${scale}) translate(-256 -256)">
		<rect x="176" y="70" width="160" height="380" rx="80" fill="rgb(200 225 255 / 0.12)" stroke="rgb(210 232 255 / 0.85)" stroke-width="14"/>
		<rect x="160" y="58" width="192" height="28" rx="14" fill="rgb(210 232 255 / 0.9)"/>
		${[
			['#ff3b47', 370],
			['#2f7bff', 258],
			['#ffd51f', 146]
		]
			.map(
				([color, y]) => `
		<circle cx="256" cy="${y}" r="52" fill="${color}"/>
		<circle cx="256" cy="${y}" r="52" fill="url(#shade)"/>
		<ellipse cx="238" cy="${Number(y) - 20}" rx="22" ry="14" fill="#fff" opacity="0.7"/>`
			)
			.join('')}
	</g>`;

const svg = (/** @type {number} */ scale, /** @type {number} */ radius) =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
	<defs>
		<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#0a1824"/><stop offset="0.5" stop-color="#07131d"/><stop offset="1" stop-color="#050d15"/>
		</linearGradient>
		<radialGradient id="teal" cx="25%" cy="20%" r="70%">
			<stop offset="0" stop-color="#086e7d" stop-opacity="0.7"/><stop offset="1" stop-color="#086e7d" stop-opacity="0"/>
		</radialGradient>
		<radialGradient id="violet" cx="85%" cy="85%" r="70%">
			<stop offset="0" stop-color="#5037aa" stop-opacity="0.65"/><stop offset="1" stop-color="#5037aa" stop-opacity="0"/>
		</radialGradient>
		<radialGradient id="shade" cx="35%" cy="30%" r="75%">
			<stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.4"/>
		</radialGradient>
	</defs>
	<rect width="512" height="512" rx="${radius}" fill="url(#bg)"/>
	<rect width="512" height="512" rx="${radius}" fill="url(#teal)"/>
	<rect width="512" height="512" rx="${radius}" fill="url(#violet)"/>${art(scale)}
</svg>
`;

const any = svg(1, 0);
// Maskable icons must keep their content inside the central 80% circle.
const maskable = svg(0.72, 0);
const rounded = svg(1, 112);

const png = [
	['icon-192.png', any, 192],
	['icon-512.png', any, 512],
	['maskable-512.png', maskable, 512],
	['apple-touch-icon.png', any, 180],
	['favicon-32.png', rounded, 32]
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, source, size] of png) {
	await page.setViewportSize({ width: Number(size), height: Number(size) });
	await page.setContent(
		`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${source}`
	);
	await writeFile(new URL(String(name), out), await page.screenshot({ omitBackground: true }));
}
await browser.close();
await writeFile(new URL('icon.svg', out), rounded);
