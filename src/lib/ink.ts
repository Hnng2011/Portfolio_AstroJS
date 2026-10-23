interface Lobe {
	x: number;
	width: number;
	reach: number;
	lag: number;
	bulb: boolean;
}

interface Drop {
	x: number;
	at: number;
	r: number;
}

interface Pour {
	start: number;
	duration: number;
	flood: boolean;
	lobes: Lobe[];
	drops: Drop[];
	phase: number;
}

export interface InkOptions {
	color: string;
	originX?: number;
	onCovered: () => void;
}

// Tune the poured ink here.
export const INK = {
	ink: '#17130f',
	paper: '#f0e9dc',
	// Width of the inked edge in px, how far it boils in px, and how many times a second it is redrawn.
	outline: 2.6,
	jitter: 2.4,
	boil: 8,
	// Scribbled shading just inside the edge: gap between the zigzags and how deep they reach, in px.
	hatch: 7,
	shade: 24,
	// Drops shaken off ahead of each pour.
	drops: 6,
};

const TAU = Math.PI * 2;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const noise = (a: number, seed: number) =>
	Math.sin(a * 3 + seed * 1.3) * 0.55 + Math.sin(a * 5 - seed * 2.1) * 0.3 + Math.sin(a * 9 + seed * 0.7) * 0.15;
// The boil: a new seed a few times a second, so the inked edge is redrawn by a slightly different hand.
const boilSeed = (s: number) => (Math.floor(s * INK.boil) * 1.618) % 100;

// The boil's wobble for each column of the edge, worked out again only when the seed moves on.
function boiler(xs: Float32Array) {
	const jit = new Float32Array(xs.length);
	let at = -1;
	return (seed: number) => {
		if (seed !== at) {
			at = seed;
			for (let i = 0; i < xs.length; i++) jit[i] = INK.jitter * noise(xs[i] / 70, seed);
		}
		return jit;
	};
}

function pour(start: number, duration: number, flood: boolean, originX: number): Pour {
	// Drips are a share of the screen wide, but never thinner than a fat marker on a phone.
	const thin = 14 / Math.max(320, innerWidth);
	const lobes = Array.from({ length: flood ? 7 : 6 }, () => ({
		x: clamp01(originX + (Math.random() - 0.5) * (flood ? 1.4 : 1)),
		width: Math.max(thin, flood ? 0.022 + Math.random() * 0.04 : 0.02 + Math.random() * 0.035),
		reach: flood ? 0.08 + Math.random() * 0.1 : 0.06 + Math.random() * 0.13,
		lag: Math.random() * (flood ? 0.25 : 0.4),
		bulb: Math.random() < 0.75,
	}));
	const drops = Array.from({ length: INK.drops }, (_, i) => ({
		x: clamp01(lobes[i % lobes.length].x + (Math.random() - 0.5) * 0.01),
		at: 0.3 + Math.random() * 0.4,
		r: 2.5 + Math.random() * 4,
	}));
	return { start, duration, flood, lobes, drops, phase: Math.random() * TAU };
}

function edge(p: Pour, t: number, u: number, originX: number, now: number) {
	const body = p.flood
		? -0.25 + 1.55 * easeInOut(t)
		: (0.08 + 0.34 * Math.exp(-Math.pow((u - originX) / 0.3, 2))) * easeOut(t);
	const wave =
		(0.022 * Math.sin(u * 7.5 + p.phase + now * 0.9) + 0.012 * Math.sin(u * 17 - p.phase * 1.7 + now * 1.4)) *
		Math.min(1, t * 3);
	let lobes = 0;
	for (const l of p.lobes) lobes += l.reach * grown(l, t) * Math.exp(-Math.pow((u - l.x) / l.width, 2));
	return body + wave + lobes;
}

const grown = (l: Lobe, t: number) => easeOut(clamp01((t - l.lag) / (1 - l.lag)));

function inkCanvas(z: string, pointer: string) {
	const canvas = document.createElement('canvas');
	canvas.setAttribute('aria-hidden', 'true');
	Object.assign(canvas.style, {
		position: 'fixed',
		inset: '0',
		width: '100%',
		height: '100%',
		zIndex: z,
		pointerEvents: pointer,
	});
	document.body.append(canvas);
	const W = innerWidth;
	const H = innerHeight;
	const dpr = Math.min(devicePixelRatio || 1, 2);
	canvas.width = Math.round(W * dpr);
	canvas.height = Math.round(H * dpr);
	const ctx = canvas.getContext('2d')!;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	return { canvas, ctx, W, H };
}

// Adds a small wobbly blob to the current path (clockwise, like the ink sheets, so the fill joins them).
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, rw: number, rh: number, seed: number) {
	const n = 8;
	let px = 0;
	let py = 0;
	for (let k = 0; k <= n + 1; k++) {
		const a = (k / n) * TAU;
		// A teardrop: the top of the drop pulls to a point as it falls.
		const m = (1 + 0.12 * noise(a, seed)) * (1 + 0.7 * Math.pow(Math.max(0, -Math.sin(a)), 3));
		const x1 = x + Math.cos(a) * rw * m;
		const y1 = y + Math.sin(a) * rh * m;
		if (k === 0) {
			px = x1;
			py = y1;
			continue;
		}
		if (k === 1) ctx.moveTo((px + x1) / 2, (py + y1) / 2);
		else ctx.quadraticCurveTo(px, py, (px + x1) / 2, (py + y1) / 2);
		px = x1;
		py = y1;
	}
	ctx.closePath();
}

// Inks the sheet traced into the current path, fills it, then shades just inside the edge and adds a second, broken
// pen line just outside it. `ys` is the edge; `side` is 1 when the ink lies above it, -1 when below. The pen lifts
// over the hanging drops listed in `bulbs` (x, y, r triples).
function inkEdge(
	ctx: CanvasRenderingContext2D,
	color: string,
	xs: Float32Array,
	ys: Float32Array,
	n: number,
	side: number,
	seed: number,
	phase: number,
	H: number,
	bulbs: Float32Array,
	nb: number,
) {
	ctx.lineWidth = INK.outline * 2;
	ctx.strokeStyle = INK.ink;
	ctx.stroke();
	ctx.fillStyle = color;
	ctx.fill();

	// Hatching: short slanted pen strokes into the ink, kept to the shallowest point nearby so none pokes out past a drip.
	ctx.beginPath();
	const stride = Math.max(1, Math.round(INK.hatch / Math.max(1, xs[1] - xs[0])));
	for (let i = 0; i < n; i += stride) {
		let e = ys[i];
		for (let k = Math.max(0, i - stride * 2); k <= Math.min(n - 1, i + stride * 2); k++)
			e = side > 0 ? Math.min(e, ys[k]) : Math.max(e, ys[k]);
		if (e < -INK.shade || e > H + INK.shade) continue;
		const len = INK.shade * (0.6 + 0.4 * noise(xs[i] * 0.05, seed));
		const y = e - side * (INK.outline + 1.5);
		ctx.moveTo(xs[i], y);
		ctx.lineTo(xs[i] + len * 0.4, y - side * len);
	}
	ctx.globalAlpha = 0.32;
	ctx.lineWidth = 1.4;
	ctx.stroke();

	// The second pass of the pen, lifted over steep drips.
	ctx.beginPath();
	let pen = false;
	const lift = (xs[1] - xs[0]) * 1.4;
	for (let i = 1; i < n - 1; i++) {
		const run = Math.sin(xs[i] * 0.011 + phase) + Math.sin(xs[i] * 0.004 - phase * 1.7);
		let over = false;
		for (let b = 0; b < nb; b += 3) if (Math.abs(xs[i] - bulbs[b]) < bulbs[b + 2] + 6) over = true;
		if (over || run < 0.6 || Math.abs(ys[i + 1] - ys[i - 1]) > lift) {
			pen = false;
			continue;
		}
		const y = ys[i] + side * INK.outline * 2;
		if (pen) ctx.lineTo(xs[i], y);
		else ctx.moveTo(xs[i], y);
		pen = true;
	}
	ctx.globalAlpha = 0.8;
	ctx.stroke();
	ctx.globalAlpha = 1;
}

export function pourInk({ color, originX = 0.4, onCovered }: InkOptions) {
	const { canvas, ctx, W, H } = inkCanvas('200', 'auto');
	canvas.dataset.ink = '';
	ctx.fillStyle = color;

	if (reduced()) {
		ctx.fillRect(0, 0, W, H);
		canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, fill: 'forwards' }).finished.then(onCovered);
		return;
	}

	const pours = [pour(0, 1.05, false, originX), pour(0.95, 1.05, true, 1 - originX)];
	const step = Math.max(3, W / 320);
	const n = Math.ceil(W / step) + 1;
	const xs = Float32Array.from({ length: n }, (_, i) => Math.min(i * step, W));
	const ys = new Float32Array(n);
	const boil = boiler(xs);
	const bulbs = new Float32Array(pours.length * 8 * 3);
	const t0 = performance.now();
	let done = false;

	const tick = (now: number) => {
		const s = (now - t0) / 1000;
		const seed = boilSeed(s);
		let shallowest = Infinity;
		let flooding = false;
		ys.fill(-8);
		for (const p of pours) {
			const t = clamp01((s - p.start) / p.duration);
			if (t <= 0) continue;
			for (let i = 0; i < n; i++) {
				const y = edge(p, t, xs[i] / W, originX, s) * H;
				if (p.flood) shallowest = Math.min(shallowest, y);
				if (y > ys[i]) ys[i] = y;
			}
			if (p.flood) flooding = true;
		}
		const jit = boil(seed);
		for (let i = 0; i < n; i++) ys[i] += jit[i];

		if ((flooding && shallowest > H + 2) || s > 2.4) {
			ctx.fillStyle = color;
			ctx.fillRect(0, 0, W, H);
			if (!done) {
				done = true;
				onCovered();
			}
			return;
		}

		// One sheet of ink from the top, with round drops hanging off the drips and a few shaken loose ahead.
		ctx.clearRect(0, 0, W, H);
		ctx.beginPath();
		ctx.moveTo(W + 8, -8);
		ctx.lineTo(W + 8, ys[n - 1]);
		for (let i = n - 1; i >= 0; i--) ctx.lineTo(xs[i], ys[i]);
		ctx.lineTo(-8, ys[0]);
		ctx.lineTo(-8, -8);
		ctx.closePath();
		let nb = 0;
		pours.forEach((p, k) => {
			const t = clamp01((s - p.start) / p.duration);
			if (t <= 0) return;
			p.lobes.forEach((l, j) => {
				const i = Math.round((l.x * W) / step);
				const tip = edge(p, t, l.x, originX, s) * H + jit[i];
				if (!l.bulb || tip < ys[i] - 2 || tip > H + 40) return;
				const r0 = Math.min(24, Math.max(5, l.width * W * 0.5));
				const r = r0 * clamp01((l.reach * grown(l, t) * H) / (r0 * 2.5));
				if (r < 2) return;
				const y = tip - r * 0.45;
				ctx.moveTo(xs[i] + r, y);
				ctx.arc(xs[i], y, r * (1 + 0.04 * noise(j, seed)), 0, TAU);
				bulbs[nb++] = xs[i];
				bulbs[nb++] = y;
				bulbs[nb++] = r;
			});
			p.drops.forEach((d, j) => {
				const l = p.lobes[j % p.lobes.length];
				const at = Math.max(d.at, l.lag + 0.15);
				if (t < at) return;
				const fall = (t - at) * p.duration;
				const y0 = edge(p, at, l.x, originX, p.start + at * p.duration) * H;
				const y = y0 + d.r + 2.2 * H * fall * fall;
				if (y - d.r > H + 4) return;
				blob(ctx, d.x * W, y, d.r, d.r * (1 + Math.min(0.8, fall * 2.5)), seed + k * 7 + j);
			});
		});
		inkEdge(ctx, color, xs, ys, n, 1, seed, pours[0].phase, H, bulbs, nb);

		// A cartoon shine on each hanging drop.
		ctx.beginPath();
		for (let b = 0; b < nb; b += 3) {
			const x = bulbs[b];
			const y = bulbs[b + 1];
			const r = bulbs[b + 2];
			if (r < 5) continue;
			ctx.moveTo(x + Math.cos(Math.PI * 1.05) * r * 0.6, y + Math.sin(Math.PI * 1.05) * r * 0.6);
			ctx.arc(x, y, r * 0.6, Math.PI * 1.05, Math.PI * 1.4);
		}
		ctx.strokeStyle = INK.paper;
		ctx.lineWidth = 2.4;
		ctx.globalAlpha = 0.75;
		ctx.stroke();
		ctx.globalAlpha = 1;
		requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
}

export function bindInkLinks(options: Omit<InkOptions, 'onCovered' | 'originX'>) {
	drainInk();
	document.addEventListener('click', (e) => {
		const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-ink]');
		if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		if (new URL(link.href).pathname === location.pathname) return;
		const r = link.getBoundingClientRect();
		pourInk({
			...options,
			originX: (r.left + r.width / 2) / innerWidth,
			onCovered: () => {
				try {
					sessionStorage.setItem('ink', options.color);
				} catch {}
				location.assign(link.href);
			},
		});
	});
	addEventListener('pageshow', (e) => {
		if (e.persisted) document.querySelectorAll('canvas[data-ink]').forEach((c) => c.remove());
	});
}

function drainInk() {
	const root = document.documentElement;
	let color = '';
	try {
		color = sessionStorage.getItem('ink') ?? '';
		sessionStorage.removeItem('ink');
	} catch {}
	if (!color) return;
	const { canvas, ctx, W, H } = inkCanvas('300', 'none');
	root.classList.remove('ink-arrive');
	ctx.fillStyle = color;
	if (reduced()) {
		canvas.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).finished.then(() => canvas.remove());
		ctx.fillRect(0, 0, W, H);
		return;
	}
	const p = pour(0, 0.9, true, 0.5);
	const step = Math.max(3, W / 320);
	const n = Math.ceil(W / step) + 1;
	const xs = Float32Array.from({ length: n }, (_, i) => Math.min(i * step, W));
	const ys = new Float32Array(n);
	const boil = boiler(xs);
	const edgeAt = (t: number, u: number) => {
		let lobe = 0;
		for (const l of p.lobes) lobe += l.reach * Math.exp(-Math.pow((u - l.x) / l.width, 2));
		const wave = 0.025 * Math.sin(u * 7.5 + p.phase + t * 3) + 0.012 * Math.sin(u * 17 - t * 4);
		return (-0.25 + 1.6 * easeInOut(t) + wave - lobe * 0.7 * Math.min(1, t * 2)) * H;
	};
	// Drops left behind as the ink slides off, falling after it (late enough to be gone when it is).
	const drops = p.drops.map((d) => ({ ...d, at: 0.35 + (d.at - 0.3) * 0.375 }));
	const none = new Float32Array(0);
	const t0 = performance.now();
	const tick = (now: number) => {
		const t = clamp01((now - t0) / 1000 / 0.9);
		const seed = boilSeed(t * 0.9);
		const jit = boil(seed);
		for (let i = 0; i < n; i++) ys[i] = edgeAt(t, xs[i] / W) + jit[i];
		ctx.clearRect(0, 0, W, H);
		ctx.beginPath();
		ctx.moveTo(-8, H + 8);
		ctx.lineTo(-8, ys[0]);
		for (let i = 0; i < n; i++) ctx.lineTo(xs[i], ys[i]);
		ctx.lineTo(W + 8, ys[n - 1]);
		ctx.lineTo(W + 8, H + 8);
		ctx.closePath();
		drops.forEach((d, j) => {
			if (t < d.at) return;
			const fall = (t - d.at) * 0.9;
			const y = edgeAt(d.at, d.x) - d.r * 2 + H * (0.9 * fall + 2.4 * fall * fall);
			if (y - d.r * 2 > H) return;
			blob(ctx, d.x * W, y, d.r, d.r * (1 + Math.min(0.8, fall * 2.5)), seed + j);
		});
		inkEdge(ctx, color, xs, ys, n, -1, seed, p.phase, H, none, 0);
		if (t < 1) requestAnimationFrame(tick);
		else canvas.remove();
	};
	ctx.fillRect(0, 0, W, H);
	requestAnimationFrame(tick);
}
