export interface SolarFrame {
	yaw: number;
	time: number;
	hover: number;
	hoverAmt: number;
	intro: number;
	focus: number;
	focusAmt: number;
	leanX: number;
	leanY: number;
	turn: number;
	view: SolarView | null;
	labels: number;
}

export interface SolarView {
	cx: number;
	cy: number;
	s: number;
	clip: { x: number; y: number; w: number; h: number; r: number };
}

export interface ScreenDisc {
	x: number;
	y: number;
	r: number;
}

// Tune the drawing here.
export const TUNING = {
	// Ink and paper colours.
	ink: '#17130f',
	paper: '#f0e9dc',
	sun: '#f2a541',
	sunDeep: '#c2701c',
	// Marker colours the planets are filled with (and the ink thrown when one is opened).
	markers: ['#ef8f6f', '#5fb3a3', '#7aa6d9', '#b49ad6'],
	// Outline width in px and how much the hand-drawn outline wobbles (share of the radius).
	outline: 2.2,
	wobble: 0.018,
	// Times per second the hand-drawn lines are redrawn ("line boil"); 0 keeps them still.
	boil: 8,
	// Gap between the zigzags of the scribbled shading, in px.
	hatch: 5,
	// Small hand-drawn stars scattered around the system.
	stars: 14,
	// How fast the whole system turns on its own (radians per second).
	spin: 0.05,
	// How far the system inside the cube turns when the character carries it side-on (radians).
	carryTurn: 1.05,
	// Camera: how far the orbit plane tips toward the viewer, and how much it leans to the right.
	tip: { desktop: 0.56, mobile: 0.62 },
	lean: { desktop: 0.08, mobile: 1.25 },
};

// One look per project, in the order of `projects` in src/data/portfolio.ts.
interface Look {
	color: number;
	size: number;
	pattern: 'bands' | 'stripes' | 'craters' | 'dots' | 'half' | 'grid' | 'storm' | 'diagonal';
	tilt: number;
	spin: number;
	ring?: { outer: number; flat: number };
	moons?: number;
}

const LOOKS: Look[] = [
	{ color: 0, size: 1.3, pattern: 'storm', tilt: 0.12, spin: 0.12, moons: 2 },
	{ color: 1, size: 1, pattern: 'grid', tilt: 0.25, spin: 0.1 },
	{ color: 3, size: 1.05, pattern: 'stripes', tilt: -0.2, spin: 0.16, ring: { outer: 2.05, flat: 0.3 } },
	{ color: 2, size: 0.74, pattern: 'dots', tilt: 0.1, spin: 0.2 },
	{ color: 0, size: 0.95, pattern: 'bands', tilt: -0.3, spin: 0.14, ring: { outer: 2.2, flat: 0.26 } },
	{ color: 1, size: 0.86, pattern: 'half', tilt: 0.4, spin: 0.18 },
	{ color: 2, size: 0.9, pattern: 'craters', tilt: -0.15, spin: 0.15, moons: 3 },
	{ color: 3, size: 0.68, pattern: 'diagonal', tilt: 0.3, spin: 0.22 },
];

const FOV = 26;
const TAU = Math.PI * 2;

const noise = (a: number, seed: number) =>
	Math.sin(a * 3 + seed * 1.3) * 0.55 + Math.sin(a * 5 - seed * 2.1) * 0.3 + Math.sin(a * 9 + seed * 0.7) * 0.15;

const wrap1 = (v: number) => ((((v + 1) % 2) + 2) % 2) - 1;

interface Body extends ScreenDisc {
	z: number;
	i: number;
	alpha: number;
	hover: number;
	focused: number;
}

export class Solar {
	readonly count: number;
	private ctx: CanvasRenderingContext2D;
	private w = 1;
	private h = 1;
	private dist = 1000;
	private R = 400;
	private size = 20;
	private sunR = 40;
	private tip = 0.46;
	private lean = 0.08;
	private turn = -0.15;
	private carry = 0;
	private offY = 0;
	private dprScale = 1;
	private seed = 0;
	private lastBoil = 0;
	private bodies: Body[] = [];
	private labelW: number[] = [];
	private labelA: number[] = [];
	private doodles: { x: number; y: number; r: number; kind: number; phase: number }[] = [];
	sunDisc: ScreenDisc = { x: 0, y: 0, r: 0 };
	focusDisc: ScreenDisc = { x: 0, y: 0, r: 0 };

	constructor(
		private canvas: HTMLCanvasElement,
		count: number,
		private labels: HTMLElement[],
	) {
		this.count = count;
		this.ctx = canvas.getContext('2d')!;
	}

	setQuality(dprScale: number) {
		this.dprScale = dprScale;
		this.layout(this.w, this.h);
	}

	layout(w: number, h: number) {
		this.w = w;
		this.h = h;
		const dpr = Math.min(devicePixelRatio || 1, 2) * this.dprScale;
		this.canvas.width = Math.round(w * dpr);
		this.canvas.height = Math.round(h * dpr);
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		this.dist = h / 2 / Math.tan((FOV * Math.PI) / 360);

		const mobile = w < 768;
		this.tip = mobile ? TUNING.tip.mobile : TUNING.tip.desktop;
		this.lean = mobile ? TUNING.lean.mobile : TUNING.lean.desktop;
		this.turn = mobile ? -0.08 : -0.15;
		this.R = Math.max(w, h) * 0.4;
		this.offY = 0;
		const bounds = () => {
			let y0 = Infinity;
			let y1 = -Infinity;
			for (let a = 0; a < 48; a++) {
				const p = this.place(this.R, (a / 48) * TAU, 0, 0);
				y0 = Math.min(y0, p.y);
				y1 = Math.max(y1, p.y);
			}
			return { y0, y1 };
		};
		for (let k = 0; k < 4; k++) {
			let x0 = Infinity;
			let x1 = -Infinity;
			let y0 = Infinity;
			let y1 = -Infinity;
			for (let a = 0; a < 48; a++) {
				const p = this.place(this.R, (a / 48) * TAU, 0, 0);
				x0 = Math.min(x0, p.x);
				x1 = Math.max(x1, p.x);
				y0 = Math.min(y0, p.y);
				y1 = Math.max(y1, p.y);
			}
			this.R *= Math.min((w * (mobile ? 0.84 : 0.97)) / (x1 - x0), (h * (mobile ? 0.66 : 0.84)) / (y1 - y0));
		}
		const { y0, y1 } = bounds();
		const room = { top: mobile ? 250 : 40, bottom: mobile ? 90 : 40 };
		this.offY = (room.top + (h - room.bottom)) / 2 - (y0 + y1) / 2;
		this.size = this.R * (mobile ? 0.07 : 0.05);
		this.sunR = this.R * (mobile ? 0.095 : 0.085);
		this.labelW = [];
		let seed = 7;
		const rnd = () => {
			seed = (seed * 9301 + 49297) % 233280;
			return seed / 233280;
		};
		this.doodles = [];
		for (let tries = 0; this.doodles.length < TUNING.stars && tries < 400; tries++) {
			const x = 24 + rnd() * (w - 48);
			const y = 24 + rnd() * (h - 48);
			const inHud = (x < 300 && y < 180) || (x > w - 320 && y > h - 150);
			const nearSun = Math.hypot(x - w / 2, y - h / 2) < this.sunR * 2.6;
			const crowded = this.doodles.some((d) => Math.hypot(d.x - x, d.y - y) < 90);
			if (inHud || nearSun || crowded) continue;
			this.doodles.push({ x, y, r: 5 + rnd() * 7, kind: Math.floor(rnd() * 3), phase: rnd() * TAU });
		}
	}

	private orbitRadius(i: number) {
		return this.R * (0.44 + 0.56 * (i / Math.max(1, this.count - 1)));
	}

	private place(r: number, th: number, leanX: number, leanY: number) {
		const lx = r * Math.cos(th);
		const lz = r * Math.sin(th);
		const e = this.tip + leanY * 0.05;
		const y1 = -lz * Math.sin(e);
		const z1 = lz * Math.cos(e);
		const phi = this.turn + this.carry + leanX * 0.05;
		const x2 = lx * Math.cos(phi) + z1 * Math.sin(phi);
		const z2 = -lx * Math.sin(phi) + z1 * Math.cos(phi);
		const rho = this.lean;
		const x3 = x2 * Math.cos(rho) - y1 * Math.sin(rho);
		const y3 = x2 * Math.sin(rho) + y1 * Math.cos(rho);
		const s = this.dist / (this.dist - z2);
		return { x: this.w / 2 + x3 * s, y: this.h / 2 - y3 * s + this.offY, z: z2, s };
	}

	private wobblePath(x: number, y: number, rx: number, ry: number, rot: number, seed: number, from = 0, to = TAU) {
		const steps = Math.max(18, Math.min(72, Math.round(Math.max(rx, ry) * 0.9)));
		const path = new Path2D();
		const c = Math.cos(rot);
		const s = Math.sin(rot);
		for (let k = 0; k <= steps; k++) {
			const a = from + ((to - from) * k) / steps;
			const m = 1 + TUNING.wobble * noise(a, seed);
			const px = Math.cos(a) * rx * m;
			const py = Math.sin(a) * ry * m;
			const X = x + px * c - py * s;
			const Y = y + px * s + py * c;
			if (k === 0) path.moveTo(X, Y);
			else path.lineTo(X, Y);
		}
		return path;
	}

	private hatch(x: number, y: number, r: number, angle: number, gap: number) {
		const path = new Path2D();
		const c = Math.cos(angle);
		const s = Math.sin(angle);
		let side = -1;
		for (let d = -r; d <= r; d += gap) {
			const j = noise(d * 0.21, this.seed) * r * 0.08;
			const px = x + c * side * (r + j) - s * d;
			const py = y + s * side * (r + j) + c * d;
			if (d === -r) path.moveTo(px, py);
			else path.lineTo(px, py);
			side = -side;
		}
		return path;
	}

	private sketch(x: number, y: number, r: number, seed: number, width: number) {
		const { ctx } = this;
		const start = (seed * 2.3) % TAU;
		ctx.lineWidth = width;
		ctx.stroke(this.wobblePath(x, y, r, r, 0, seed, start, start + TAU + 0.35));
		ctx.globalAlpha *= 0.75;
		ctx.lineWidth = width * 0.55;
		ctx.stroke(
			this.wobblePath(
				x + r * 0.015,
				y - r * 0.02,
				r * 1.02,
				r * 1.02,
				0,
				seed + 31,
				start + 1.7,
				start + 1.7 + TAU - 0.5,
			),
		);
		ctx.globalAlpha /= 0.75;
	}

	private drawDoodles(time: number, alpha: number) {
		const { ctx } = this;
		ctx.globalAlpha = alpha * 0.7;
		ctx.lineWidth = 1.5;
		for (const d of this.doodles) {
			const tw = 1 + 0.18 * Math.sin(time * 1.6 + d.phase);
			const r = d.r * tw;
			const j = noise(d.phase, this.seed) * 0.8;
			ctx.strokeStyle = d.kind === 0 ? TUNING.sunDeep : TUNING.ink;
			ctx.beginPath();
			if (d.kind === 0) {
				ctx.moveTo(d.x - r + j, d.y);
				ctx.quadraticCurveTo(d.x, d.y, d.x, d.y - r - j);
				ctx.quadraticCurveTo(d.x, d.y, d.x + r, d.y + j);
				ctx.quadraticCurveTo(d.x, d.y, d.x - j, d.y + r);
				ctx.quadraticCurveTo(d.x, d.y, d.x - r + j, d.y);
			} else if (d.kind === 1) {
				ctx.moveTo(d.x - r, d.y + j);
				ctx.lineTo(d.x + r, d.y - j);
				ctx.moveTo(d.x + j, d.y - r);
				ctx.lineTo(d.x - j, d.y + r);
			} else {
				ctx.arc(d.x + j, d.y, r * 0.35, 0, TAU);
			}
			ctx.stroke();
		}
		ctx.strokeStyle = TUNING.ink;
		ctx.globalAlpha = 1;
	}

	private shade(b: Body, lx: number, ly: number) {
		const { ctx } = this;
		const { x, y, r } = b;
		const gap = Math.max(3, TUNING.hatch * Math.max(0.7, r / 40));
		ctx.save();
		const lit = new Path2D();
		lit.arc(x, y, r * 1.2, 0, TAU);
		lit.arc(x + lx * r * 0.5, y + ly * r * 0.5, r * 1.08, 0, TAU);
		ctx.clip(lit, 'evenodd');
		ctx.lineWidth = Math.max(0.9, r / 40);
		ctx.stroke(this.hatch(x, y, r, Math.atan2(ly, lx) + Math.PI / 2 + 0.6, gap));
		const deep = new Path2D();
		deep.arc(x, y, r * 1.2, 0, TAU);
		deep.arc(x + lx * r * 0.9, y + ly * r * 0.9, r * 1.12, 0, TAU);
		ctx.clip(deep, 'evenodd');
		ctx.stroke(this.hatch(x, y, r, Math.atan2(ly, lx) - 0.4, gap));
		ctx.restore();
	}

	private wave(r: number, yy: number, amp: number, freq: number, phase: number) {
		const p = new Path2D();
		for (let k = 0; k <= 24; k++) {
			const xx = -r + (2 * r * k) / 24;
			const yv = yy + Math.sin((xx / r) * freq + phase) * amp;
			if (k === 0) p.moveTo(xx, yv);
			else p.lineTo(xx, yv);
		}
		return p;
	}

	private pattern(b: Body, look: Look, time: number) {
		const { ctx } = this;
		const { x, y, r } = b;
		const roll = time * look.spin;
		const ph = roll * TAU;
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(look.tilt);
		ctx.lineWidth = Math.max(1, r / 28);
		switch (look.pattern) {
			case 'bands':
				for (const k of [-0.62, -0.3, 0.05, 0.38, 0.68]) ctx.stroke(this.wave(r, k * r, r * 0.05, 3, k * 4 + ph));
				break;
			case 'stripes': {
				for (const [a, b2] of [
					[-0.5, -0.28],
					[0.12, 0.3],
				]) {
					const band = new Path2D();
					for (let k = 0; k <= 24; k++) {
						const xx = -r + (2 * r * k) / 24;
						band.lineTo(xx, a * r + Math.sin((xx / r) * 2.5 + a * 5 + ph) * r * 0.06);
					}
					for (let k = 24; k >= 0; k--) {
						const xx = -r + (2 * r * k) / 24;
						band.lineTo(xx, b2 * r + Math.sin((xx / r) * 2.5 + b2 * 5 + ph) * r * 0.06);
					}
					band.closePath();
					ctx.fill(band);
				}
				ctx.stroke(this.wave(r, 0.62 * r, r * 0.04, 3, 1 + ph));
				break;
			}
			case 'craters':
				for (const [cx, cy, cr] of [
					[-0.35, -0.3, 0.2],
					[0.3, -0.05, 0.14],
					[-0.1, 0.4, 0.16],
					[0.5, 0.45, 0.09],
					[-0.6, 0.15, 0.08],
				]) {
					const px = wrap1(cx + roll * 0.5);
					const e = new Path2D();
					e.ellipse(px * r, cy * r, cr * r, cr * r * 0.75, 0, 0, TAU);
					ctx.stroke(e);
					const inner = new Path2D();
					inner.ellipse(
						px * r + cr * r * 0.15,
						cy * r + cr * r * 0.12,
						cr * r * 0.6,
						cr * r * 0.4,
						0,
						Math.PI * 0.1,
						Math.PI * 0.9,
					);
					ctx.stroke(inner);
				}
				break;
			case 'dots':
				for (let gy = -1; gy <= 1; gy += 0.22) {
					for (let gx = -1; gx <= 1; gx += 0.22) {
						const off = (Math.round(gy / 0.22) % 2) * 0.11;
						const px = wrap1(gx + off + roll * 0.4);
						ctx.beginPath();
						ctx.arc(px * r, gy * r, r * (0.035 + 0.025 * Math.max(0, px + gy)), 0, TAU);
						ctx.fill();
					}
				}
				break;
			case 'half': {
				const split = new Path2D();
				for (let k = 0; k <= 20; k++) {
					const yy = -r + (2 * r * k) / 20;
					const xx = Math.sin((yy / r) * 3 + ph) * r * 0.08;
					if (k === 0) split.moveTo(xx, yy);
					else split.lineTo(xx, yy);
				}
				ctx.stroke(split);
				for (let yy = -r; yy <= r; yy += Math.max(2, r * 0.16)) {
					ctx.beginPath();
					ctx.moveTo(-r, yy);
					ctx.lineTo(Math.sin((yy / r) * 3 + ph) * r * 0.08, yy);
					ctx.stroke();
				}
				break;
			}
			case 'grid':
				for (const k of [-0.6, -0.2, 0.2, 0.6]) {
					const sh = wrap1(k + roll * 0.4);
					const m = new Path2D();
					m.ellipse(
						0,
						0,
						Math.max(0.5, Math.abs(sh) * r),
						r,
						0,
						sh < 0 ? Math.PI / 2 : -Math.PI / 2,
						sh < 0 ? Math.PI * 1.5 : Math.PI / 2,
					);
					ctx.stroke(m);
				}
				for (const k of [-0.55, 0, 0.55]) ctx.stroke(this.wave(r, k * r, 0, 1, 0));
				break;
			case 'storm': {
				for (const k of [-0.68, -0.42, 0.42, 0.7]) ctx.stroke(this.wave(r, k * r, r * 0.05, 3, k * 3 + ph));
				ctx.stroke(this.wave(r, -0.12 * r, r * 0.04, 2, 2 + ph));
				const ex = wrap1(0.25 + roll * 0.6) * r;
				for (const s of [0.34, 0.22, 0.1]) {
					const eye = new Path2D();
					eye.ellipse(ex, r * 0.12, r * s, r * s * 0.6, 0, 0, TAU);
					ctx.stroke(eye);
				}
				break;
			}
			case 'diagonal':
				ctx.rotate(0.7);
				for (let k = -1; k <= 1; k += 0.2)
					ctx.stroke(this.wave(r * 1.3, wrap1(k + roll * 0.3) * r * 1.2, r * 0.03, 4, k));
				break;
		}
		ctx.restore();
	}

	private ring(b: Body, look: Look, front: boolean) {
		if (!look.ring) return;
		const { ctx } = this;
		const { x, y, r } = b;
		const rot = look.tilt - 0.18;
		const from = front ? 0 : Math.PI;
		const to = front ? Math.PI : TAU;
		const outer = r * look.ring.outer;
		const inner = r * 1.3;
		const flat = look.ring.flat;
		const c = Math.cos(rot);
		const s = Math.sin(rot);
		const band = new Path2D();
		const arc = (rad: number, a0: number, a1: number) => {
			for (let k = 0; k <= 30; k++) {
				const a = a0 + ((a1 - a0) * k) / 30;
				const px = Math.cos(a) * rad;
				const py = Math.sin(a) * rad * flat;
				band.lineTo(x + px * c - py * s, y + px * s + py * c);
			}
		};
		arc(outer, from, to);
		arc(inner, to, from);
		band.closePath();
		ctx.fillStyle = TUNING.paper;
		ctx.fill(band);
		ctx.globalAlpha *= 0.45;
		ctx.fillStyle = this.colorOf(b.i);
		ctx.fill(band);
		ctx.globalAlpha /= 0.45;
		ctx.fillStyle = TUNING.ink;
		ctx.lineWidth = TUNING.outline * 0.8;
		ctx.stroke(this.wobblePath(x, y, outer, outer * flat, rot, this.seed + 3, from, to));
		ctx.stroke(this.wobblePath(x, y, inner, inner * flat, rot, this.seed + 5, from, to));
		ctx.lineWidth = 0.9;
		const mid = (outer + inner) / 2;
		ctx.stroke(this.wobblePath(x, y, mid, mid * flat, rot, this.seed + 7, from, to));
	}

	private drawPlanet(b: Body, time: number) {
		if (b.r < 1) return;
		const { ctx } = this;
		const look = LOOKS[b.i % LOOKS.length];
		const sx = this.sunDisc.x - b.x;
		const sy = this.sunDisc.y - b.y;
		const sl = Math.hypot(sx, sy) || 1;
		ctx.globalAlpha = b.alpha;
		this.ring(b, look, false);

		const outline = this.wobblePath(b.x, b.y, b.r, b.r, 0, this.seed + b.i * 1.7);
		ctx.fillStyle = this.colorOf(b.i);
		ctx.fill(outline);
		ctx.fillStyle = TUNING.ink;
		ctx.save();
		ctx.clip(outline);
		this.pattern(b, look, time);
		this.shade(b, sx / sl, sy / sl);
		ctx.restore();
		this.sketch(
			b.x,
			b.y,
			b.r,
			this.seed + b.i * 1.7,
			TUNING.outline * (1 + b.hover * 0.45) * Math.max(0.8, Math.min(1.8, b.r / 26)),
		);

		this.ring(b, look, true);
		const moons = look.moons ?? 0;
		for (let k = 0; k < moons; k++) {
			const a = time * 0.6 + (k / moons) * TAU;
			const dist = moons === 3 ? 1.75 : 1.9 + k * 0.5;
			const mr = b.r * (moons === 3 ? 0.14 : 0.2);
			const m = this.wobblePath(
				b.x + Math.cos(a) * dist * b.r,
				b.y + Math.sin(a) * dist * b.r * 0.35,
				mr,
				mr,
				0,
				this.seed + k,
			);
			ctx.fillStyle = TUNING.paper;
			ctx.fill(m);
			ctx.lineWidth = TUNING.outline * 0.7;
			ctx.stroke(m);
		}
		ctx.fillStyle = TUNING.ink;
		ctx.globalAlpha = 1;
	}

	private drawSun(time: number, alpha: number) {
		const { ctx } = this;
		const { x, y, r } = this.sunDisc;
		if (r < 1) return;
		ctx.globalAlpha = alpha;
		const rays = new Path2D();
		const n = 14;
		const turn = time * 0.08;
		for (let k = 0; k < n; k++) {
			const a = turn + (k / n) * TAU;
			const len = r * (1.42 + 0.12 * Math.sin(time * 1.4 + k * 1.9) + (k % 2) * 0.1);
			const w = (TAU / n) * 0.32;
			const sway = 0.06 * Math.sin(time * 2 + k);
			rays.moveTo(x + Math.cos(a - w) * r * 1.02, y + Math.sin(a - w) * r * 1.02);
			rays.quadraticCurveTo(
				x + Math.cos(a + 0.12) * len * 0.82,
				y + Math.sin(a + 0.12) * len * 0.82,
				x + Math.cos(a + sway) * len,
				y + Math.sin(a + sway) * len,
			);
			rays.quadraticCurveTo(
				x + Math.cos(a - 0.05) * len * 0.8,
				y + Math.sin(a - 0.05) * len * 0.8,
				x + Math.cos(a + w) * r * 1.02,
				y + Math.sin(a + w) * r * 1.02,
			);
			rays.closePath();
		}
		ctx.fillStyle = TUNING.sun;
		ctx.fill(rays);
		ctx.lineWidth = TUNING.outline;
		ctx.stroke(rays);

		const body = this.wobblePath(x, y, r, r, 0, this.seed + 11);
		ctx.fill(body);
		ctx.save();
		ctx.clip(body);
		ctx.strokeStyle = TUNING.sunDeep;
		ctx.lineWidth = Math.max(1.2, r / 22);
		for (let k = 0; k < 3; k++) {
			const dir = k % 2 ? 1 : -1;
			const s = new Path2D();
			s.arc(x - r * 0.1, y + r * 0.1, r * (0.35 + k * 0.2), -0.2 + time * 0.1 * dir, 1.6 + time * 0.1 * dir);
			ctx.stroke(s);
		}
		ctx.restore();
		this.sketch(x, y, r, this.seed + 11, TUNING.outline * 1.2);
		ctx.fillStyle = TUNING.ink;
		ctx.globalAlpha = 1;
	}

	render(f: SolarFrame, now: number) {
		const { ctx, w, h } = this;
		if (TUNING.boil > 0 && now - this.lastBoil > 1000 / TUNING.boil) {
			this.lastBoil = now;
			this.seed = (this.seed + 1.618) % 100;
		}
		ctx.clearRect(0, 0, w, h);
		this.carry = f.turn;
		const view = f.view;
		if (view) {
			ctx.save();
			const { x, y, w: cw, h: ch, r } = view.clip;
			ctx.beginPath();
			ctx.roundRect(x, y, cw, ch, r);
			ctx.clip();
			ctx.translate(view.cx, view.cy);
			ctx.scale(view.s, view.s);
			ctx.translate(-w / 2, -h / 2 - this.offY);
		}
		ctx.strokeStyle = TUNING.ink;
		ctx.fillStyle = TUNING.ink;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		const e = f.intro;
		const fa = f.focusAmt;

		const sunP = this.place(0, 0, f.leanX, f.leanY);
		const sunR = this.sunR * (1 - Math.pow(1 - Math.min(1, e * 1.6), 3));
		this.sunDisc = { x: sunP.x, y: sunP.y, r: sunR * sunP.s };

		this.drawDoodles(f.time, e * (1 - 0.6 * fa));
		const orbitAlpha = 0.34 * e * (1 - 0.75 * fa);
		ctx.lineWidth = 1.2;
		ctx.setLineDash([12, 7, 3, 7]);
		for (let i = 0; i < this.count; i++) {
			const r = this.orbitRadius(i) * (0.35 + 0.65 * e);
			const path = new Path2D();
			for (let k = 0; k <= 96; k++) {
				const p = this.place(r * (1 + 0.004 * noise((k / 96) * TAU, this.seed + i)), (k / 96) * TAU, f.leanX, f.leanY);
				if (k === 0) path.moveTo(p.x, p.y);
				else path.lineTo(p.x, p.y);
			}
			ctx.globalAlpha = Math.min(1, orbitAlpha * (f.hover === i ? 1 + f.hoverAmt * 1.4 : 1));
			ctx.stroke(path);
		}
		ctx.setLineDash([]);
		ctx.globalAlpha = 1;

		const mobile = w < 768;
		const target = { x: w / 2, y: h * (mobile ? 0.76 : 0.79), r: Math.min(w, h) * (mobile ? 0.13 : 0.09) };
		this.bodies = [];
		for (let i = 0; i < this.count; i++) {
			const look = LOOKS[i % LOOKS.length];
			const r = this.orbitRadius(i) * (0.35 + 0.65 * e);
			const th = ((i * 3) / this.count) * TAU + f.time * TUNING.spin + f.yaw;
			const p = this.place(r, th, f.leanX, f.leanY);
			const appear = Math.min(1, Math.max(0, e * 1.6 - 0.25 - i * 0.07));
			const grow = 1 - Math.pow(1 - appear, 3);
			const hover = f.hover === i ? f.hoverAmt : 0;
			let x = p.x;
			let y = p.y;
			let radius = this.size * look.size * grow * p.s * (1 + hover * 0.16);
			let z = p.z;
			const focused = f.focus === i ? f.focusAmt : 0;
			if (focused > 0) {
				x += (target.x - x) * focused;
				y += (target.y - y) * focused;
				radius += (target.r * look.size ** 0.3 - radius) * focused;
				z += (this.dist - z) * focused * 0.5;
			}
			this.bodies.push({ x, y, r: radius, z, i, alpha: grow * (focused > 0 ? 1 : 1 - 0.78 * fa), hover, focused });
			if (f.focus === i) this.focusDisc = { x, y, r: radius };
		}

		const order = [...this.bodies].sort((a, b) => a.z - b.z);
		let sunDrawn = false;
		for (const b of order) {
			if (!sunDrawn && b.z >= 0) {
				this.drawSun(f.time, 1 - 0.6 * fa);
				sunDrawn = true;
			}
			this.drawPlanet(b, f.time);
		}
		if (!sunDrawn) this.drawSun(f.time, 1 - 0.6 * fa);
		if (view) ctx.restore();

		this.placeLabels(fa, f.labels);
	}

	private placeLabels(fa: number, on: number) {
		const discs = this.bodies.map((b) => {
			const look = LOOKS[b.i % LOOKS.length];
			const rx = b.r * (look.ring ? look.ring.outer : 1.05);
			const ry = b.r * 1.05;
			return { i: b.i, z: b.z, box: [b.x - rx, b.y - ry, b.x + rx, b.y + ry] };
		});
		const sun = this.sunDisc;
		const order = [...this.bodies].sort((a, b) => b.hover - a.hover || b.z - a.z);
		const taken: number[][] = [];
		const hits = (box: number[], other: number[]) =>
			box[0] < other[2] && box[2] > other[0] && box[1] < other[3] && box[3] > other[1];
		for (const b of order) {
			const label = this.labels[b.i];
			if (!label) continue;
			const look = LOOKS[b.i % LOOKS.length];
			const lw = (this.labelW[b.i] ||= label.offsetWidth || 80);
			const lh = 22;
			const top = b.y + b.r * (look.ring ? 1.1 : 1) + 10;
			const lx = Math.min(this.w - lw / 2 - 10, Math.max(lw / 2 + 10, b.x));
			const box = [lx - lw / 2 - 4, top + 3, lx + lw / 2 + 4, top + lh - 3];
			const blocked =
				taken.some((t) => hits(box, t)) ||
				discs.some((d) => d.i !== b.i && d.z > b.z && hits(box, d.box)) ||
				hits(box, [sun.x - sun.r * 1.2, sun.y - sun.r * 1.2, sun.x + sun.r * 1.2, sun.y + sun.r * 1.2]);
			if (!blocked) taken.push(box);
			const show = blocked ? 0 : b.alpha * (1 - fa) * on;
			label.style.transform = `translate3d(${lx}px, ${top}px, 0) translateX(-50%)`;
			this.labelA[b.i] = (this.labelA[b.i] ?? show) + (show - (this.labelA[b.i] ?? show)) * 0.12;
			label.style.opacity = String(this.labelA[b.i]);
			label.classList.toggle('is-hover', b.hover > 0.5);
		}
	}

	get centerY() {
		return this.h / 2 + this.offY;
	}

	colorOf(i: number) {
		return TUNING.markers[LOOKS[i % LOOKS.length].color % TUNING.markers.length];
	}

	pick(x: number, y: number, skip = -1): number {
		let best = -1;
		let bestZ = -Infinity;
		const sun = this.sunDisc;
		for (const b of this.bodies) {
			if (b.i === skip) continue;
			const look = LOOKS[b.i % LOOKS.length];
			const reach = Math.max(18, b.r * (look.ring ? 1.4 : 1.12) + 6);
			if ((x - b.x) ** 2 + (y - b.y) ** 2 > reach * reach) continue;
			if (b.z < 0 && Math.hypot(x - sun.x, y - sun.y) < sun.r) continue;
			if (b.z > bestZ) {
				bestZ = b.z;
				best = b.i;
			}
		}
		return best;
	}
}
