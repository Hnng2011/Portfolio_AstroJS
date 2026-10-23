export interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
}

// Tune the thrown ink here.
export const SPLAT = {
	color: '#f2a541',
	ink: '#17130f',
	paper: '#f0e9dc',
	outline: 2.4,
	// Seconds: the throw, the splash, and how fast it wipes away.
	throw: 0.26,
	splash: 0.42,
	away: 0.28,
	// Seconds the ink takes to flood the whole screen when a case opens, and to pull back.
	flood: 0.6,
	// How far past the content the ink spreads, and how many tendrils and droplets it throws.
	spread: 1.1,
	tendrils: 9,
	droplets: 16,
	// Times per second the inked lines are redrawn ("line boil"); 0 keeps them still. How far they wobble (share of the radius).
	boil: 8,
	wobble: 0.012,
	// Scribbled shading in a crescent on the shadow side, like the planets: gap between zigzags in px, and how deep the
	// crescent reaches (share of the radius).
	hatch: 6,
	shade: 0.15,
	// Short pen flicks thrown off with the splash.
	flicks: 6,
};

interface Shape {
	lumps: [number, number, number][];
	bumps: { a: number; w: number; h: number }[];
	tendrils: { a: number; len: number; w: number; bend: number }[];
	drops: { a: number; d: number; r: number; s: number; tail: number; ink: boolean }[];
	flicks: { a: number; gap: number; len: number; bend: number }[];
	light: number;
}

const TAU = Math.PI * 2;
// Points around the rim, sampled once a frame and shared by the outline, shading and shine.
const SAMPLES = 120;
const COS = Float32Array.from({ length: SAMPLES }, (_, k) => Math.cos((k / SAMPLES) * TAU));
const SIN = Float32Array.from({ length: SAMPLES }, (_, k) => Math.sin((k / SAMPLES) * TAU));
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const easeBack = (p: number) => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
const wrap = (a: number) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const noise = (a: number, seed: number) =>
	Math.sin(a * 3 + seed * 1.3) * 0.55 + Math.sin(a * 5 - seed * 2.1) * 0.3 + Math.sin(a * 9 + seed * 0.7) * 0.15;

export class Splat {
	private ctx: CanvasRenderingContext2D;
	private w = 0;
	private h = 0;
	private shape: Shape | null = null;
	private box: Box = { x: 0, y: 0, w: 0, h: 0 };
	private from = { x: 0, y: 0 };
	private t0 = 0;
	private leaving = -1;
	private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
	private color = SPLAT.color;
	private flood = { from: 0, to: 0, at: 0 };
	private keepOut: Box[] = [];
	private seed = 0;
	private boilAt = 0;
	private radii = new Float32Array(SAMPLES);
	private box0 = new Float32Array(SAMPLES);
	private rest = new Float32Array(SAMPLES);
	private boiled = new Float32Array(SAMPLES);
	private cache: { hw: number; hh: number; shape: Shape | null; seed: number } = { hw: 0, hh: 0, shape: null, seed: -1 };
	private px = new Float32Array(16);
	private py = new Float32Array(16);
	// What the canvas last showed, so a still splat is only redrawn when its lines boil.
	private shown = { x: 0, y: 0, w: 0, h: 0, seed: -1, full: false, valid: false };
	private drawn = false;

	constructor(private canvas: HTMLCanvasElement) {
		this.ctx = canvas.getContext('2d')!;
	}

	resize(w: number, h: number) {
		const dpr = Math.min(devicePixelRatio || 1, 2);
		this.w = w;
		this.h = h;
		this.canvas.width = Math.round(w * dpr);
		this.canvas.height = Math.round(h * dpr);
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		this.shown.valid = false;
	}

	throw(fromX: number, fromY: number, box: Box, color = SPLAT.color, keepOut: Box[] = []) {
		this.color = color;
		this.keepOut = keepOut;
		const rnd = Math.random;
		const tendrils = Array.from({ length: SPLAT.tendrils }, () => ({
			a: rnd() * TAU,
			len: 0.12 + rnd() * 0.22,
			w: 0.05 + rnd() * 0.05,
			bend: (rnd() - 0.5) * 0.5,
		}));
		this.shape = {
			lumps: Array.from({ length: 4 }, () => [2 + Math.floor(rnd() * 4), rnd() * TAU, 0.025 + rnd() * 0.035]),
			bumps: Array.from({ length: 9 }, () => ({ a: rnd() * TAU, w: 0.1 + rnd() * 0.14, h: 0.018 + rnd() * 0.04 })),
			tendrils,
			drops: Array.from({ length: SPLAT.droplets }, (_, i) => {
				const ink = i % 4 === 3;
				return {
					a: rnd() * TAU,
					d: 1.12 + rnd() * 0.5,
					r: ink ? 1.4 + rnd() * 2 : 2 + rnd() * 8,
					s: 1 + rnd() * 0.45,
					tail: rnd() < 0.5 ? 0.35 + rnd() * 0.6 : 0,
					ink,
				};
			}),
			// Flicks sit in the gaps between the tendrils.
			flicks: Array.from({ length: SPLAT.flicks }, () => {
				let a = rnd() * TAU;
				for (const td of tendrils) if (Math.abs(wrap(a - td.a)) < 0.2) a += 0.4;
				return { a, gap: 7 + rnd() * 12, len: 10 + rnd() * 20, bend: (rnd() - 0.5) * 0.5 };
			}),
			light: -2.55 + (rnd() - 0.5) * 0.3,
		};
		this.box = box;
		this.from = { x: fromX, y: fromY };
		this.t0 = performance.now();
		this.leaving = -1;
		this.shown.valid = false;
	}

	follow(box: Box) {
		this.box = box;
	}

	floodTo(on: boolean) {
		const now = performance.now();
		this.flood = { from: this.floodAmount(now), to: on ? 1 : 0, at: now };
		this.shown.valid = false;
	}

	private floodAmount(now: number) {
		const { from, to, at } = this.flood;
		if (from === to || this.reduced) return to;
		const p = clamp01((now - at) / 1000 / SPLAT.flood);
		const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
		return from + (to - from) * e;
	}

	get flooded() {
		return this.flood.to === 1 && this.floodAmount(performance.now()) >= 0.999;
	}

	get tint() {
		return this.color;
	}

	wipe() {
		this.flood = { from: 0, to: 0, at: 0 };
		if (this.shape && this.leaving < 0) this.leaving = performance.now();
	}

	get painted() {
		return (
			this.shape !== null &&
			this.leaving < 0 &&
			(this.reduced || (performance.now() - this.t0) / 1000 > SPLAT.throw + SPLAT.splash * 0.45)
		);
	}

	// The rim at rest: a rounded box around the content with this throw's lumps and scallops, then the boil on top.
	// Each part is worked out again only when it changes (box size, throw, boil seed), not every frame.
	private settle(hw: number, hh: number) {
		const { cache } = this;
		const shape = this.shape!;
		if (cache.hw !== hw || cache.hh !== hh || cache.shape !== shape) {
			Object.assign(cache, { hw, hh, shape, seed: -1 });
			for (let k = 0; k < SAMPLES; k++) {
				const a = (k / SAMPLES) * TAU;
				const c = Math.abs(COS[k]);
				const s = Math.abs(SIN[k]);
				const base = Math.pow(Math.pow(c / hw, 4) + Math.pow(s / hh, 4), -1 / 4) * SPLAT.spread;
				let m = 1;
				for (const [f, ph, amp] of shape.lumps) m += (Math.sin(a * f + ph) + 1) * 0.5 * amp;
				for (const b of shape.bumps) {
					const d = wrap(a - b.a) / b.w;
					m += b.h * Math.exp(-d * d);
				}
				this.box0[k] = base;
				this.rest[k] = base * m;
			}
		}
		if (cache.seed !== this.seed) {
			cache.seed = this.seed;
			for (let k = 0; k < SAMPLES; k++) {
				const a = (k / SAMPLES) * TAU;
				this.boiled[k] =
					this.rest[k] + this.box0[k] * SPLAT.wobble * (noise(a, this.seed) + 0.5 * Math.sin(a * 13 + this.seed * 3.1));
			}
		}
	}

	// The rim's radius at any angle, read from this frame's samples.
	private rim(a: number) {
		let u = (a / TAU) % 1;
		if (u < 0) u += 1;
		const f = u * SAMPLES;
		const i = Math.min(SAMPLES - 1, Math.floor(f));
		const r0 = this.radii[i];
		return r0 + (this.radii[(i + 1) % SAMPLES] - r0) * (f - i);
	}

	// Adds a small wobbly blob to the current path, clockwise like the body so the fill joins them.
	private blob(x: number, y: number, rx: number, ry: number, rot: number, seed: number, tail = 0, n = 9) {
		const { ctx, px, py } = this;
		const c = Math.cos(rot);
		const s = Math.sin(rot);
		for (let k = 0; k < n; k++) {
			const a = (k / n) * TAU;
			const m = (1 + 0.12 * noise(a, seed)) * (1 + tail * Math.pow(Math.max(0, -Math.cos(a)), 3));
			const lx = Math.cos(a) * rx * m;
			const ly = Math.sin(a) * ry * m;
			px[k] = x + lx * c - ly * s;
			py[k] = y + lx * s + ly * c;
		}
		ctx.moveTo((px[n - 1] + px[0]) / 2, (py[n - 1] + py[0]) / 2);
		for (let k = 0; k < n; k++) {
			const j = (k + 1) % n;
			ctx.quadraticCurveTo(px[k], py[k], (px[k] + px[j]) / 2, (py[k] + py[j]) / 2);
		}
		ctx.closePath();
	}

	// Adds the body's rim, smoothed through this frame's samples, to the current path.
	private body(cx: number, cy: number) {
		const { ctx, radii } = this;
		let lx = cx + COS[SAMPLES - 1] * radii[SAMPLES - 1];
		let ly = cy + SIN[SAMPLES - 1] * radii[SAMPLES - 1];
		let x = cx + COS[0] * radii[0];
		let y = cy + SIN[0] * radii[0];
		ctx.moveTo((lx + x) / 2, (ly + y) / 2);
		for (let k = 0; k < SAMPLES; k++) {
			const j = (k + 1) % SAMPLES;
			lx = x;
			ly = y;
			x = cx + COS[j] * radii[j];
			y = cy + SIN[j] * radii[j];
			ctx.quadraticCurveTo(lx, ly, (lx + x) / 2, (ly + y) / 2);
		}
		ctx.closePath();
	}

	// Adds a line that follows the rim from a0 to a1, `off` px outside it; given minHalf, the pen lifts over tendrils.
	private along(cx: number, cy: number, a0: number, a1: number, off: number, minHalf = 0) {
		const { ctx } = this;
		const steps = Math.max(6, Math.round(Math.abs(a1 - a0) * 24));
		let pen = false;
		for (let k = 0; k <= steps; k++) {
			const a = a0 + ((a1 - a0) * k) / steps;
			const r = this.rim(a) + off;
			let lift = false;
			if (minHalf) for (const td of this.shape!.tendrils) if (Math.abs(wrap(a - td.a)) < (td.w * minHalf * 1.7) / r + 0.03) lift = true;
			if (lift) {
				pen = false;
				continue;
			}
			const x = cx + Math.cos(a) * r;
			const y = cy + Math.sin(a) * r;
			if (pen) ctx.lineTo(x, y);
			else ctx.moveTo(x, y);
			pen = true;
		}
	}

	private hidden(x: number, y: number, r: number) {
		if (x < r || y < r || x > this.w - r || y > this.h - r) return true;
		return this.keepOut.some((k) => x > k.x - r && x < k.x + k.w + r && y > k.y - r && y < k.y + k.h + r);
	}

	draw(now: number) {
		const { ctx } = this;
		const shape = this.shape;
		if (!shape) {
			if (this.drawn) ctx.clearRect(0, 0, this.w, this.h);
			this.drawn = false;
			return;
		}
		if (!this.reduced && SPLAT.boil > 0 && now - this.boilAt > 1000 / SPLAT.boil) {
			this.boilAt = now;
			this.seed = (this.seed + 1.618) % 100;
		}

		let t = this.reduced ? 10 : (now - this.t0) / 1000;
		let away = 0;
		if (this.leaving >= 0) {
			away = this.reduced ? 1 : clamp01((now - this.leaving) / 1000 / SPLAT.away);
			if (away >= 1) {
				this.shape = null;
				ctx.clearRect(0, 0, this.w, this.h);
				this.drawn = false;
				return;
			}
		}

		// A splat that has settled is only redrawn when its lines boil or the box drifts a pixel (never while it fills
		// the screen).
		const flood = this.floodAmount(now);
		const { box, shown } = this;
		const full = flood >= 0.999;
		const settled =
			this.leaving < 0 &&
			t > SPLAT.throw + SPLAT.splash + 0.1 &&
			(this.reduced || now - this.flood.at > SPLAT.flood * 1000 || this.flood.from === this.flood.to);
		const near = (a: number, b: number) => Math.abs(a - b) < 0.75;
		if (
			settled &&
			shown.valid &&
			(full
				? shown.full
				: shown.seed === this.seed &&
					near(shown.x, box.x) &&
					near(shown.y, box.y) &&
					near(shown.w, box.w) &&
					near(shown.h, box.h))
		)
			return;
		Object.assign(shown, { x: box.x, y: box.y, w: box.w, h: box.h, seed: this.seed, full, valid: settled });

		ctx.clearRect(0, 0, this.w, this.h);
		this.drawn = true;
		const cx = box.x + box.w / 2;
		const cy = box.y + box.h / 2;
		const hw = box.w / 2;
		const hh = box.h / 2;
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		ctx.strokeStyle = SPLAT.ink;

		const pThrow = clamp01(t / SPLAT.throw);
		if (pThrow < 1) {
			this.drawThrow(pThrow, cx, cy);
			return;
		}

		t -= SPLAT.throw;
		const pSplash = clamp01(t / SPLAT.splash);
		const cover =
			(Math.hypot(Math.max(cx, this.w - cx), Math.max(cy, this.h - cy)) / (Math.min(hw, hh) * SPLAT.spread)) * 1.15;
		const grow = Math.max(0.12, easeBack(pSplash)) * (1 - easeOut(away) * 0.9) * (1 + (cover - 1) * flood);
		const reach = easeOut(clamp01((t - 0.05) / SPLAT.splash));
		const minHalf = Math.min(hw, hh);
		const alpha = 1 - away * 0.3;
		this.settle(hw, hh);
		for (let k = 0; k < SAMPLES; k++) this.radii[k] = this.boiled[k] * grow;

		// The ink: body, tendrils and drops in one path, inked underneath and filled on top so they read as one splash.
		ctx.beginPath();
		this.body(cx, cy);

		shape.tendrils.forEach((td, i) => {
			const r0 = this.rim(td.a) * 0.96;
			const len =
				td.len * minHalf * reach * (1 - away) * (1 + flood * 1.5) * (1 + 0.06 * Math.sin(this.seed * 2.3 + i));
			if (len < 1) return;
			const w = td.w * minHalf * (1 + flood * 0.6);
			const ux = Math.cos(td.a);
			const uy = Math.sin(td.a);
			const x0 = cx + ux * r0;
			const y0 = cy + uy * r0;
			const bend = td.bend * len;
			const tx = x0 + ux * len - uy * bend * 0.5;
			const ty = y0 + uy * len + ux * bend * 0.5;
			const mx = x0 + ux * len * 0.6 - uy * bend;
			const my = y0 + uy * len * 0.6 + ux * bend;
			ctx.moveTo(x0 + uy * w, y0 - ux * w);
			ctx.quadraticCurveTo(mx + uy * w * 0.2, my - ux * w * 0.2, tx, ty);
			ctx.quadraticCurveTo(mx - uy * w * 0.2, my + ux * w * 0.2, x0 - uy * w, y0 + ux * w);
			ctx.closePath();
			if (len > 4) this.blob(tx, ty, w * 0.55, w * 0.55, td.a, this.seed + i);
		});

		const dropGrow = easeOut(clamp01((t - 0.08) / 0.3)) * (1 - away);
		shape.drops.forEach((d, i) => {
			if (d.ink) return;
			const r = this.rim(d.a) * d.d * (0.6 + 0.4 * reach);
			const x = cx + Math.cos(d.a) * r;
			const y = cy + Math.sin(d.a) * r;
			const rr = d.r * dropGrow;
			if (rr < 0.5 || this.hidden(x, y, rr)) return;
			this.blob(x, y, rr * d.s, rr / Math.sqrt(d.s), d.a, this.seed + i * 0.7, d.tail);
		});

		ctx.globalAlpha = alpha;
		ctx.lineWidth = SPLAT.outline * 2;
		ctx.stroke();
		ctx.fillStyle = this.color;
		ctx.fill();

		this.drawShade(cx, cy, shape.light + Math.PI, alpha);
		this.drawShine(cx, cy, shape.light, alpha);
		this.drawSketch(cx, cy, shape, minHalf, alpha);

		// Pen flicks and specks of plain ink, flung off with the splash.
		ctx.beginPath();
		shape.flicks.forEach((f, i) => {
			const len = f.len * reach * (1 - away);
			if (len < 2) return;
			const ux = Math.cos(f.a);
			const uy = Math.sin(f.a);
			const r = this.rim(f.a) + f.gap * (0.4 + 0.6 * reach);
			const x0 = cx + ux * r;
			const y0 = cy + uy * r;
			if (this.hidden(x0, y0, len)) return;
			const j = 1 + 0.08 * Math.sin(this.seed * 1.7 + i * 2);
			const bend = f.bend * len;
			const tx = x0 + ux * len * j - uy * bend;
			const ty = y0 + uy * len * j + ux * bend;
			const mx = x0 + ux * len * 0.5 - uy * bend * 0.8;
			const my = y0 + uy * len * 0.5 + ux * bend * 0.8;
			const w = 1.5;
			ctx.moveTo(x0 + uy * w, y0 - ux * w);
			ctx.quadraticCurveTo(mx + uy * w * 0.6, my - ux * w * 0.6, tx, ty);
			ctx.quadraticCurveTo(mx - uy * w * 0.6, my + ux * w * 0.6, x0 - uy * w, y0 + ux * w);
			ctx.closePath();
		});
		shape.drops.forEach((d, i) => {
			if (!d.ink) return;
			const r = this.rim(d.a) * d.d * (0.6 + 0.4 * reach);
			const x = cx + Math.cos(d.a) * r;
			const y = cy + Math.sin(d.a) * r;
			const rr = d.r * dropGrow;
			if (rr < 0.5 || this.hidden(x, y, rr)) return;
			this.blob(x, y, rr, rr, d.a, this.seed + i, 0, 7);
		});
		ctx.fillStyle = SPLAT.ink;
		ctx.fill();
		ctx.globalAlpha = 1;
	}

	// In flight: a wobbly teardrop with speed lines trailing it.
	private drawThrow(p: number, cx: number, cy: number) {
		const { ctx } = this;
		const e = easeOut(p);
		const x = this.from.x + (cx - this.from.x) * e;
		const y = this.from.y + (cy - this.from.y) * e - Math.sin(Math.PI * e) * 60;
		const ang = Math.atan2(cy - this.from.y - Math.cos(Math.PI * e) * Math.PI * 60, cx - this.from.x);
		const r = 10 + p * 8;
		ctx.beginPath();
		this.blob(x, y, r * 1.3, r * 0.82, ang, this.seed, 0.9, 12);
		ctx.lineWidth = SPLAT.outline * 2;
		ctx.stroke();
		ctx.fillStyle = this.color;
		ctx.fill();
		const ux = Math.cos(ang);
		const uy = Math.sin(ang);
		ctx.beginPath();
		for (const off of [-0.6, 0, 0.6]) {
			const back = r * (2.3 + Math.abs(off) * 0.6);
			const sx = x - ux * back - uy * off * r;
			const sy = y - uy * back + ux * off * r;
			const len = r * (1.6 - Math.abs(off) * 0.6) * (0.7 + 0.3 * p);
			ctx.moveTo(sx, sy);
			ctx.lineTo(sx - ux * len, sy - uy * len);
		}
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(x - r * 0.1, y - r * 0.05, r * 0.5, Math.PI * 1.05, Math.PI * 1.45);
		ctx.strokeStyle = SPLAT.paper;
		ctx.lineWidth = 2.2;
		ctx.stroke();
	}

	// Scribbled zigzag shading in a crescent on the side away from the light, the way the planets are shaded.
	private drawShade(cx: number, cy: number, dark: number, alpha: number) {
		const { ctx, radii } = this;
		let reach = 0;
		for (let k = 0; k < SAMPLES; k++) reach = Math.max(reach, radii[k]);
		reach *= 1.1;
		// Capped, so the band stays a pen's width of shading as the ink floods the screen.
		const off = Math.min(64, SPLAT.shade * this.rim(dark));
		if (off < 3) return;
		ctx.save();
		ctx.beginPath();
		this.body(cx, cy);
		ctx.clip();
		ctx.beginPath();
		ctx.rect(cx - reach, cy - reach, reach * 2, reach * 2);
		this.body(cx - Math.cos(dark) * off, cy - Math.sin(dark) * off);
		ctx.clip('evenodd');
		const angle = dark + Math.PI / 2 + 0.6 + 0.02 * Math.sin(this.seed);
		const c = Math.cos(angle);
		const s = Math.sin(angle);
		const gap = Math.max(SPLAT.hatch, (reach * 2) / 220);
		ctx.beginPath();
		let side = -1;
		for (let d = -reach; d <= reach; d += gap) {
			const j = noise(d * 0.21, this.seed) * reach * 0.04;
			const x = cx + c * side * (reach + j) - s * d;
			const y = cy + s * side * (reach + j) + c * d;
			if (d === -reach) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
			side = -side;
		}
		ctx.globalAlpha = alpha * 0.32;
		ctx.lineWidth = 1.3;
		ctx.stroke();
		ctx.restore();
		ctx.globalAlpha = alpha;
	}

	// A cartoon shine: a long and a short paper stroke just inside the lit rim.
	private drawShine(cx: number, cy: number, light: number, alpha: number) {
		const { ctx } = this;
		ctx.beginPath();
		this.along(cx, cy, light - 0.32, light + 0.02, -12);
		this.along(cx, cy, light + 0.12, light + 0.2, -12);
		ctx.globalAlpha = alpha * 0.75;
		ctx.strokeStyle = SPLAT.paper;
		ctx.lineWidth = 3.4;
		ctx.stroke();
		ctx.strokeStyle = SPLAT.ink;
		ctx.globalAlpha = alpha;
	}

	// A second, thinner pass of the pen just outside the outline, lifted where a tendril leaves the body.
	private drawSketch(cx: number, cy: number, shape: Shape, minHalf: number, alpha: number) {
		const { ctx } = this;
		const dark = shape.light + Math.PI;
		ctx.beginPath();
		this.along(cx, cy, dark - 1.15, dark + 0.45, SPLAT.outline * 1.9, minHalf);
		this.along(cx, cy, shape.light + 0.55, shape.light + 1.05, SPLAT.outline * 1.9, minHalf);
		ctx.globalAlpha = alpha * 0.85;
		ctx.lineWidth = 1.3;
		ctx.stroke();
		ctx.globalAlpha = alpha;
	}
}
