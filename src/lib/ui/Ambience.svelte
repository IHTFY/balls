<script>
	/** @type {{ kind: import('../game/cosmetics.js').Theme['ambience'], color: string, reduced: boolean }} */
	let { kind, color, reduced } = $props();

	/** @type {HTMLCanvasElement} */
	let canvas;

	$effect(() => {
		if (kind === 'none') return;
		const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
		let w = 0;
		let h = 0;
		const resize = () => {
			const dpr = Math.min(devicePixelRatio || 1, 1.5);
			w = innerWidth;
			h = innerHeight;
			canvas.width = w * dpr;
			canvas.height = h * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		resize();
		addEventListener('resize', resize);

		const count = Math.round(Math.min(70, (w * h) / 16000));
		const motes = Array.from({ length: count }, () => ({
			x: Math.random() * w,
			y: Math.random() * h,
			r: Math.random(),
			s: Math.random(),
			p: Math.random() * Math.PI * 2
		}));
		let frame = 0;
		let last = performance.now();
		let gridOffset = 0;

		/** @param {number} now */
		function draw(now) {
			const dt = Math.min(0.1, (now - last) / 1000);
			last = now;
			ctx.clearRect(0, 0, w, h);
			ctx.fillStyle = color;
			ctx.strokeStyle = color;
			if (kind === 'grid') {
				gridOffset = (gridOffset + dt * 30) % 40;
				const horizon = h * 0.62;
				ctx.globalAlpha = 0.25;
				ctx.lineWidth = 1;
				for (let i = 0; i < 16; i++) {
					const y = horizon + (i * 40 + gridOffset) ** 1.35 / 6;
					if (y > h) break;
					ctx.beginPath();
					ctx.moveTo(0, y);
					ctx.lineTo(w, y);
					ctx.stroke();
				}
				for (let i = -12; i <= 12; i++) {
					ctx.beginPath();
					ctx.moveTo(w / 2 + i * 20, horizon);
					ctx.lineTo(w / 2 + i * 160, h);
					ctx.stroke();
				}
			}
			for (const m of motes) {
				m.p += dt * (0.5 + m.s);
				if (kind === 'bubbles') {
					m.y -= dt * (12 + m.s * 30);
					m.x += Math.sin(m.p) * dt * 8;
					ctx.globalAlpha = 0.12 + m.r * 0.15;
					ctx.lineWidth = 1.2;
					ctx.beginPath();
					ctx.arc(m.x, m.y, 2 + m.r * 9, 0, Math.PI * 2);
					ctx.stroke();
				} else if (kind === 'stars' || kind === 'grid') {
					if (kind === 'grid' && m.y > h * 0.6) m.y = Math.random() * h * 0.6;
					ctx.globalAlpha = 0.25 + 0.6 * Math.abs(Math.sin(m.p));
					ctx.beginPath();
					ctx.arc(m.x, m.y, 0.5 + m.r * 1.6, 0, Math.PI * 2);
					ctx.fill();
				} else if (kind === 'embers') {
					m.y -= dt * (15 + m.s * 35);
					m.x += Math.sin(m.p * 1.3) * dt * 14;
					ctx.globalAlpha = 0.2 + 0.5 * Math.abs(Math.sin(m.p * 2));
					ctx.beginPath();
					ctx.arc(m.x, m.y, 1 + m.r * 2.2, 0, Math.PI * 2);
					ctx.fill();
				} else if (kind === 'snow') {
					m.y += dt * (14 + m.s * 30);
					m.x += Math.sin(m.p) * dt * 16;
					ctx.globalAlpha = 0.5 + m.r * 0.4;
					ctx.beginPath();
					ctx.arc(m.x, m.y, 1 + m.r * 2.5, 0, Math.PI * 2);
					ctx.fill();
				} else if (kind === 'petals') {
					m.y += dt * (12 + m.s * 20);
					m.x += dt * (10 + Math.sin(m.p) * 20);
					ctx.globalAlpha = 0.25 + m.r * 0.3;
					ctx.save();
					ctx.translate(m.x, m.y);
					ctx.rotate(m.p);
					ctx.beginPath();
					ctx.ellipse(0, 0, 3 + m.r * 4, 1.5 + m.r * 2, 0, 0, Math.PI * 2);
					ctx.fill();
					ctx.restore();
				}
				if (m.y < -20) m.y = h + 20;
				if (m.y > h + 20) m.y = -20;
				if (m.x > w + 20) m.x = -20;
				if (m.x < -20) m.x = w + 20;
			}
			ctx.globalAlpha = 1;
			if (!reduced) frame = requestAnimationFrame(draw);
		}
		frame = requestAnimationFrame(draw);
		const onVisibility = () => {
			cancelAnimationFrame(frame);
			if (document.visibilityState === 'visible') {
				last = performance.now();
				frame = requestAnimationFrame(draw);
			}
		};
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			cancelAnimationFrame(frame);
			removeEventListener('resize', resize);
			document.removeEventListener('visibilitychange', onVisibility);
			ctx.clearRect(0, 0, w, h);
		};
	});
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
	canvas {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 0;
	}
</style>
