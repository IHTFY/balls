// A single full-screen canvas for confetti, sparks, and bursts.

/**
 * @typedef {object} Particle
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {number} life seconds left
 * @property {number} maxLife
 * @property {number} size
 * @property {string} color
 * @property {'spark' | 'confetti' | 'ring' | 'star'} kind
 * @property {number} spin
 * @property {number} angle
 * @property {number} gravity
 */

/** @type {CanvasRenderingContext2D | null} */
let ctx = null;
/** @type {Particle[]} */
let particles = [];
let frame = 0;
let last = 0;
let reduced = false;

/** @param {HTMLCanvasElement} canvas */
export function attachCanvas(canvas) {
	ctx = canvas.getContext('2d');
	const resize = () => {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = innerWidth * dpr;
		canvas.height = innerHeight * dpr;
		ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
	};
	resize();
	addEventListener('resize', resize);
	return () => {
		removeEventListener('resize', resize);
		cancelAnimationFrame(frame);
		ctx = null;
	};
}

/** @param {boolean} on */
export function setReducedMotion(on) {
	reduced = on;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Particle} p
 */
function draw(ctx, p) {
	const t = p.life / p.maxLife;
	ctx.globalAlpha = Math.min(1, t * 2);
	ctx.fillStyle = p.color;
	ctx.strokeStyle = p.color;
	if (p.kind === 'confetti') {
		ctx.save();
		ctx.translate(p.x, p.y);
		ctx.rotate(p.angle);
		ctx.scale(1, Math.cos(p.angle * 2));
		ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
		ctx.restore();
	} else if (p.kind === 'ring') {
		ctx.lineWidth = 3 * t;
		ctx.beginPath();
		ctx.arc(p.x, p.y, p.size * (1 - t) + 4, 0, Math.PI * 2);
		ctx.stroke();
	} else if (p.kind === 'star') {
		ctx.save();
		ctx.translate(p.x, p.y);
		ctx.rotate(p.angle);
		ctx.beginPath();
		for (let i = 0; i < 10; i++) {
			const r = i % 2 ? p.size * 0.4 : p.size;
			const a = (i * Math.PI) / 5;
			ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
		}
		ctx.fill();
		ctx.restore();
	} else {
		ctx.beginPath();
		ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * t), 0, Math.PI * 2);
		ctx.fill();
	}
}

/** @param {number} now */
function loop(now) {
	const dt = Math.min(0.05, (now - last) / 1000);
	last = now;
	if (!ctx) return;
	ctx.clearRect(0, 0, innerWidth, innerHeight);
	particles = particles.filter((p) => (p.life -= dt) > 0);
	for (const p of particles) {
		p.vy += p.gravity * dt;
		if (p.kind === 'confetti') {
			p.vx *= 0.985;
			p.vy = Math.min(p.vy, 160);
		} else {
			p.vx *= 0.96;
			p.vy *= 0.96;
		}
		p.x += p.vx * dt;
		p.y += p.vy * dt;
		p.angle += p.spin * dt;
		draw(ctx, p);
	}
	ctx.globalAlpha = 1;
	frame = particles.length ? requestAnimationFrame(loop) : 0;
}

/** @param {Partial<Particle> & { x: number, y: number }} p */
function add(p) {
	particles.push({
		vx: 0,
		vy: 0,
		life: 1,
		maxLife: p.life ?? 1,
		size: 4,
		color: '#fff',
		kind: 'spark',
		spin: 0,
		angle: Math.random() * Math.PI * 2,
		gravity: 0,
		...p
	});
}

function start() {
	if (!frame && ctx) {
		last = performance.now();
		frame = requestAnimationFrame(loop);
	}
}

/**
 * Sparks flying out from a point.
 * @param {number} x
 * @param {number} y
 * @param {string[]} colors
 * @param {number} [count]
 */
export function burst(x, y, colors, count = 24) {
	if (reduced) count = Math.min(count, 6);
	for (let i = 0; i < count; i++) {
		const a = Math.random() * Math.PI * 2;
		const speed = 120 + Math.random() * 280;
		const life = 0.5 + Math.random() * 0.5;
		add({
			x,
			y,
			vx: Math.cos(a) * speed,
			vy: Math.sin(a) * speed - 60,
			gravity: 500,
			life,
			size: 2 + Math.random() * 4,
			color: colors[i % colors.length],
			kind: i % 5 === 0 ? 'star' : 'spark',
			spin: 6
		});
	}
	add({ x, y, life: 0.45, size: 60, color: colors[0], kind: 'ring' });
	start();
}

/**
 * Confetti raining from the top and popping from the bottom corners.
 * @param {string[]} colors
 */
export function confetti(colors, amount = 160) {
	if (reduced) amount = 30;
	const w = innerWidth;
	const h = innerHeight;
	for (let i = 0; i < amount; i++) {
		const side = i % 3;
		const fromLeft = side === 0;
		const fromTop = side === 2;
		add({
			x: fromTop ? Math.random() * w : fromLeft ? -10 : w + 10,
			y: fromTop ? -20 - Math.random() * h * 0.3 : h * 0.85,
			vx: fromTop ? (Math.random() - 0.5) * 80 : (fromLeft ? 1 : -1) * (200 + Math.random() * 380),
			vy: fromTop ? 60 + Math.random() * 80 : -(500 + Math.random() * 500),
			gravity: fromTop ? 60 : 700,
			life: 2.2 + Math.random() * 1.6,
			size: 7 + Math.random() * 7,
			color: colors[i % colors.length],
			kind: 'confetti',
			spin: (Math.random() - 0.5) * 14
		});
	}
	start();
}

/**
 * A little shimmer of sparkles in a rectangle.
 * @param {DOMRect} rect
 * @param {string} color
 */
export function shimmer(rect, color, count = 10) {
	if (reduced) return;
	for (let i = 0; i < count; i++) {
		add({
			x: rect.left + Math.random() * rect.width,
			y: rect.top + Math.random() * rect.height,
			vy: -30 - Math.random() * 40,
			life: 0.6 + Math.random() * 0.6,
			size: 3 + Math.random() * 3,
			color,
			kind: 'star',
			spin: 3
		});
	}
	start();
}
