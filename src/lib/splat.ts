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
};

interface Shape {
	lumps: [number, number, number][];
	tendrils: { a: number; len: number; w: number }[];
	drops: { a: number; d: number; r: number }[];
}

const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const easeBack = (p: number) => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);

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
	}

	throw(fromX: number, fromY: number, box: Box, color = SPLAT.color, keepOut: Box[] = []) {
		this.color = color;
		this.keepOut = keepOut;
		const rnd = Math.random;
		this.shape = {
			lumps: Array.from({ length: 4 }, () => [2 + Math.floor(rnd() * 4), rnd() * TAU, 0.025 + rnd() * 0.035]),
			tendrils: Array.from({ length: SPLAT.tendrils }, () => ({
				a: rnd() * TAU,
				len: 0.12 + rnd() * 0.22,
				w: 0.05 + rnd() * 0.05,
			})),
			drops: Array.from({ length: SPLAT.droplets }, () => ({
				a: rnd() * TAU,
				d: 1.12 + rnd() * 0.5,
				r: 2 + rnd() * 8,
			})),
		};
		this.box = box;
		this.from = { x: fromX, y: fromY };
		this.t0 = performance.now();
		this.leaving = -1;
	}

	follow(box: Box) {
		this.box = box;
	}

	floodTo(on: boolean) {
		const now = performance.now();
		this.flood = { from: this.floodAmount(now), to: on ? 1 : 0, at: now };
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

	private edge(a: number, hw: number, hh: number) {
		const p = 4;
		const c = Math.abs(Math.cos(a));
		const s = Math.abs(Math.sin(a));
		const base = Math.pow(Math.pow(c / hw, p) + Math.pow(s / hh, p), -1 / p);
		let m = 1;
		for (const [f, ph, amp] of this.shape!.lumps) m += (Math.sin(a * f + ph) + 1) * 0.5 * amp;
		return base * m * SPLAT.spread;
	}

	draw(now: number) {
		const { ctx } = this;
		ctx.clearRect(0, 0, this.w, this.h);
		const shape = this.shape;
		if (!shape) return;

		let t = this.reduced ? 10 : (now - this.t0) / 1000;
		let away = 0;
		if (this.leaving >= 0) {
			away = this.reduced ? 1 : clamp01((now - this.leaving) / 1000 / SPLAT.away);
			if (away >= 1) {
				this.shape = null;
				return;
			}
		}

		const cx = this.box.x + this.box.w / 2;
		const cy = this.box.y + this.box.h / 2;
		const hw = this.box.w / 2;
		const hh = this.box.h / 2;
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';

		const pThrow = clamp01(t / SPLAT.throw);
		if (pThrow < 1) {
			const e = easeOut(pThrow);
			const x = this.from.x + (cx - this.from.x) * e;
			const y = this.from.y + (cy - this.from.y) * e - Math.sin(Math.PI * e) * 60;
			const r = 10 + pThrow * 8;
			const ang = Math.atan2(cy - this.from.y, cx - this.from.x);
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(ang);
			ctx.beginPath();
			ctx.ellipse(0, 0, r * 1.35, r * 0.8, 0, 0, TAU);
			ctx.lineWidth = SPLAT.outline * 2;
			ctx.strokeStyle = SPLAT.ink;
			ctx.stroke();
			ctx.fillStyle = this.color;
			ctx.fill();
			ctx.restore();
			return;
		}

		t -= SPLAT.throw;
		const pSplash = clamp01(t / SPLAT.splash);
		const cover =
			(Math.hypot(Math.max(cx, this.w - cx), Math.max(cy, this.h - cy)) / (Math.min(hw, hh) * SPLAT.spread)) * 1.15;
		const flood = this.floodAmount(now);
		const grow = Math.max(0.12, easeBack(pSplash)) * (1 - easeOut(away) * 0.9) * (1 + (cover - 1) * flood);
		const reach = easeOut(clamp01((t - 0.05) / SPLAT.splash));
		const minHalf = Math.min(hw, hh);

		const body = new Path2D();
		for (let k = 0; k <= 72; k++) {
			const a = (k / 72) * TAU;
			const r = this.edge(a, hw, hh) * grow;
			const x = cx + Math.cos(a) * r;
			const y = cy + Math.sin(a) * r;
			if (k === 0) body.moveTo(x, y);
			else body.lineTo(x, y);
		}
		body.closePath();
		const arms: Path2D[] = [];
		for (const td of shape.tendrils) {
			const r0 = this.edge(td.a, hw, hh) * grow * 0.96;
			const len = td.len * minHalf * reach * (1 - away);
			const w = td.w * minHalf;
			const bx = cx + Math.cos(td.a) * r0;
			const by = cy + Math.sin(td.a) * r0;
			const tx = cx + Math.cos(td.a) * (r0 + len);
			const ty = cy + Math.sin(td.a) * (r0 + len);
			const nx = -Math.sin(td.a);
			const ny = Math.cos(td.a);
			const arm = new Path2D();
			arm.moveTo(bx + nx * w, by + ny * w);
			arm.quadraticCurveTo(bx + nx * w * 0.2 + (tx - bx) * 0.6, by + ny * w * 0.2 + (ty - by) * 0.6, tx, ty);
			arm.quadraticCurveTo(
				bx - nx * w * 0.2 + (tx - bx) * 0.6,
				by - ny * w * 0.2 + (ty - by) * 0.6,
				bx - nx * w,
				by - ny * w,
			);
			arm.closePath();
			arms.push(arm);
			if (len > 4) {
				const tip = new Path2D();
				tip.arc(tx, ty, w * 0.55, 0, TAU);
				arms.push(tip);
			}
		}
		const drops = new Path2D();
		for (const d of shape.drops) {
			const r = this.edge(d.a, hw, hh) * d.d * (0.6 + 0.4 * reach) * grow;
			const x = cx + Math.cos(d.a) * r;
			const y = cy + Math.sin(d.a) * r;
			const rr = d.r * easeOut(clamp01((t - 0.08) / 0.3)) * (1 - away);
			if (rr < 0.5) continue;
			if (x < rr || y < rr || x > this.w - rr || y > this.h - rr) continue;
			if (this.keepOut.some((k) => x > k.x - rr && x < k.x + k.w + rr && y > k.y - rr && y < k.y + k.h + rr)) continue;
			drops.moveTo(x + rr, y);
			drops.arc(x, y, rr, 0, TAU);
		}

		ctx.globalAlpha = 1 - away * 0.3;
		ctx.strokeStyle = SPLAT.ink;
		ctx.lineWidth = SPLAT.outline * 2;
		ctx.stroke(body);
		for (const arm of arms) ctx.stroke(arm);
		ctx.stroke(drops);
		ctx.fillStyle = this.color;
		ctx.fill(body);
		for (const arm of arms) ctx.fill(arm);
		ctx.fill(drops);
		ctx.globalAlpha = 1;
	}
}
