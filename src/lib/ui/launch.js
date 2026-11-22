// The installed app's launch: index.html paints a copy of Chrome's launch screen, a tube of
// three balls, and defines launchExit only on a fresh launch. Once the home screen is up, the
// tube's cap pops off and the balls hop out, top one first, and fly into the BALLS title.

/** Chrome fades its own launch screen out over about 300 ms after first paint; the copy waits
 * under it, so the fade never shows the icon twice. */
const CHROME_FADE = 300;

/** @typedef {(play: (overlay: HTMLElement) => Animation[]) => void} LaunchExit */

/** Left to right across the title, for the yellow, blue, and red ball. */
const SPOTS = [0.2, 0.5, 0.8];

/** @param {boolean} reduced the game's own Reduce motion setting; the system's is checked in index.html */
export function playLaunch(reduced) {
	/** @type {{ launchExit?: LaunchExit }} */ (globalThis).launchExit?.((overlay) => {
		const word = document.querySelector('.logo .word');
		if (reduced || !word) return [];
		// The game can mount after the copy's first paint, when part of Chrome's fade has already run.
		const painted =
			performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? performance.now();
		const hold = Math.max(0, CHROME_FADE - (performance.now() - painted));
		const icon = /** @type {SVGSVGElement} */ (overlay.querySelector('#launch-icon'));
		const target = word.getBoundingClientRect();
		const mouth = /** @type {Element} */ (icon.querySelector('.cap')).getBoundingClientRect().top;
		const ease = 'cubic-bezier(0.3, 0, 0.2, 1)';
		// Drawn bottom to top, so the top (yellow) ball is last and leaves first.
		const balls = [...icon.querySelectorAll('.ball')].reverse().map((ball, i) => {
			const from = ball.getBoundingClientRect();
			// The balls sit in a scaled group, so a translate is in its units: 104 per ball.
			const unit = from.width / 104;
			const cx = from.left + from.width / 2;
			const cy = from.top + from.height / 2;
			// Up and out of the tube, to just above its mouth.
			const rise = (mouth - 0.6 * from.height - cy) / unit;
			const dx = (target.left + target.width * SPOTS[i] - cx) / unit;
			const dy = (target.top + target.height / 2 - cy) / unit;
			return ball.animate(
				[
					{ transform: 'none', easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)' },
					{ transform: `translate(0, ${rise}px) scale(1.3)`, offset: 0.35, easing: ease },
					{ transform: `translate(${dx}px, ${dy}px) scale(1.6)`, opacity: 1, offset: 0.8 },
					{ transform: `translate(${dx}px, ${dy}px) scale(2.4)`, opacity: 0 }
				],
				{ duration: 650, delay: hold + 80 * (i + 1), fill: 'both' }
			);
		});
		const fade = /** @param {Element} el @param {number} delay @param {number} duration */ (
			el,
			delay,
			duration
		) =>
			el.animate(
				{ opacity: [1, 0] },
				{ delay: hold + delay, duration, easing: 'ease-in', fill: 'both' }
			);
		const backdrop = overlay.animate(
			{ backgroundColor: ['#07131d', 'rgb(7 19 29 / 0)'] },
			{ duration: 700, delay: hold, easing: 'ease-in', fill: 'both' }
		);
		// Once the home screen shows through, the pointer reaches it, though a tap still only skips
		// what is left (index.html).
		backdrop.finished.then(() => (overlay.style.pointerEvents = 'none'));
		return [
			backdrop,
			fade(/** @type {Element} */ (icon.querySelector('.backdrop')), 100, 500),
			fade(/** @type {Element} */ (icon.querySelector('.glass')), 250, 450),
			/** @type {Element} */ (icon.querySelector('.cap')).animate(
				{
					transform: ['none', 'translate(-40px, -260px) rotate(-35deg)'],
					opacity: [1, 0]
				},
				{ duration: 380, delay: hold, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)', fill: 'both' }
			),
			...balls,
			// The title takes a small bump as the balls land in it.
			/** @type {Element} */ (word.parentElement).animate(
				{ transform: ['none', 'scale(1.06)', 'none'] },
				{ duration: 320, delay: hold + 680, easing: 'ease-out' }
			)
		];
	});
}
