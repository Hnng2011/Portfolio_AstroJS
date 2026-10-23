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
	// Extra turn about its axis (radians), as the system swings into place when the rocket arrives.
	turn: number;
	view: SolarView | null;
	labels: number;
	// Seconds since the camera stepped into the system (the pen pass re-inks it); below 0 when off.
	ink: number;
	// 0..1 while the pointer is over the sun, which opens the Archive.
	sunHover: number;
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
	// Faint far-off junk behind the system: how many pieces (at most 11), how strongly they are drawn,
	// how far they bob about (px), how far they shift against the pointer (px), and the colour of rock.
	debris: { count: 11, alpha: 0.34, drift: 5, depth: 12, stone: '#d3c6b0' },
	// How fast the whole system turns on its own (radians per second).
	spin: 0.05,
	// Camera: how far the orbit plane tips toward the viewer, and how much it leans to the right.
	tip: { desktop: 0.56, mobile: 0.62 },
	lean: { desktop: 0.08, mobile: 1.25 },
	// A planet let go after a drag springs back to its orbit: stiffness and damping of that spring.
	fling: { stiffness: 140, damping: 8 },
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

// Faint junk far behind the system, in the order it is placed (pieces that find no room are left out).
// Size is a share of a planet's size, colour a marker (-1 for rock), spin in radians per second, far 0..1 how near it looks.
type JunkKind = 'ringed' | 'craters' | 'stripes' | 'rock' | 'comet' | 'satellite' | 'nut';
const JUNK: { kind: JunkKind; size: number; color: number; spin: number; far: number }[] = [
	{ kind: 'ringed', size: 0.5, color: 3, spin: 0, far: 1 },
	{ kind: 'comet', size: 0.24, color: -1, spin: 0, far: 1 },
	{ kind: 'craters', size: 0.42, color: 2, spin: 0, far: 0.9 },
	{ kind: 'satellite', size: 0.28, color: 2, spin: 0.04, far: 0.9 },
	{ kind: 'stripes', size: 0.36, color: 1, spin: 0, far: 0.85 },
	{ kind: 'rock', size: 0.3, color: -1, spin: 0.05, far: 0.9 },
	{ kind: 'nut', size: 0.15, color: -1, spin: 0.14, far: 0.85 },
	{ kind: 'craters', size: 0.3, color: 0, spin: 0, far: 0.8 },
	{ kind: 'rock', size: 0.2, color: -1, spin: -0.08, far: 0.8 },
	{ kind: 'rock', size: 0.14, color: -1, spin: 0.1, far: 0.75 },
	{ kind: 'rock', size: 0.24, color: 0, spin: -0.04, far: 0.8 },
];

// How far each kind reaches from its centre, as a share of its size.
const JUNK_REACH: Record<JunkKind, number> = {
	ringed: 1.9,
	craters: 1.1,
	stripes: 1.1,
	rock: 1.3,
	comet: 5,
	satellite: 2.1,
	nut: 1.1,
};

interface Junk {
	kind: JunkKind;
	x: number;
	y: number;
	r: number;
	reach: number;
	color: number;
	rot: number;
	spin: number;
	far: number;
	phase: number;
	// 0 while a label is over it.
	fade: number;
	// Where its first boil frame sits on the sprite sheet, and its size there (CSS px).
	sy: number;
	w: number;
	h: number;
	// Unit vector toward the sun, for the shading.
	lx: number;
	ly: number;
}

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
	vx: number;
	vy: number;
}

interface Fling {
	x: number;
	y: number;
	vx: number;
	vy: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

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
	private swing = 0;
	private offY = 0;
	private dprScale = 1;
	private seed = 0;
	private lastBoil = 0;
	private bodies: Body[] = [];
	private labelW: number[] = [];
	private labelA: number[] = [];
	private sunLabelA = 0;
	private doodles: { x: number; y: number; r: number; kind: number; phase: number }[] = [];
	private junk: Junk[] = [];
	// The junk is drawn once per boil frame onto this sheet, then stamped each frame.
	private junkSheet = document.createElement('canvas');
	private junkCell = 0;
	private junkDpr = 1;
	private junkFor = '';
	private boilStep = 0;
	// Where the planet labels showed last frame.
	private labelBoxes: number[][] = [];
	private flings: Fling[] = [];
	private held = -1;
	private grabX = 0;
	private grabY = 0;
	private handX = 0;
	private handY = 0;
	private lastNow = 0;
	private ink = -1;
	// No overshoot on the spring when the visitor prefers reduced motion.
	calm = false;
	sunDisc: ScreenDisc = { x: 0, y: 0, r: 0 };
	focusDisc: ScreenDisc = { x: 0, y: 0, r: 0 };

	constructor(
		private canvas: HTMLCanvasElement,
		count: number,
		private labels: HTMLElement[],
		private sunLabel?: HTMLElement,
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
		const hud = this.hudBoxes(mobile);
		for (let tries = 0; this.doodles.length < TUNING.stars && tries < 400; tries++) {
			const x = 24 + rnd() * (w - 48);
			const y = 24 + rnd() * (h - 48);
			const inHud = hud.some(([x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1);
			const nearSun = Math.hypot(x - w / 2, y - h / 2) < this.sunR * 2.6;
			const crowded = this.doodles.some((d) => Math.hypot(d.x - x, d.y - y) < 90);
			if (inHud || nearSun || crowded) continue;
			this.doodles.push({ x, y, r: 5 + rnd() * 7, kind: Math.floor(rnd() * 3), phase: rnd() * TAU });
		}
		// The junk only moves when the screen size does; a change of quality just redraws its sprites.
		if (this.junkFor !== `${w}x${h}`) {
			this.junkFor = `${w}x${h}`;
			this.placeJunk(mobile);
		}
		this.drawJunkSheet(dpr);
	}

	// Boxes (x0, y0, x1, y1) the stars and the junk keep out of: the name, the links, the rocket cruising in
	// the bottom-left corner with "Fly home" beside it, and the hints along the bottom.
	private hudBoxes(mobile: boolean) {
		const { w, h } = this;
		return mobile
			? [
					[0, 0, 260, 170],
					[w / 2 - 185, 140, w / 2 + 185, 205],
					[0, h - 240, 215, h],
					[0, h - 72, w, h],
				]
			: [
					[0, 0, 460, 270],
					[w - 400, 0, w, 90],
					[0, h * 0.56, h * 0.42, h],
					[0, h - 86, h * 0.42 + 100, h],
					[w / 2 - 280, h - 100, w / 2 + 280, h],
				];
	}

	// Junk keeps clear of the HUD, the rocket, the sun and its label, and sits between the orbit lines, never on them.
	// Labels still sweep over it as the planets go round, so it fades out under them (see drawJunk).
	private placeJunk(mobile: boolean) {
		const { w, h } = this;
		let seed = 23;
		const rnd = () => {
			seed = (seed * 9301 + 49297) % 233280;
			return seed / 233280;
		};
		const hud = this.hudBoxes(mobile);
		const sun = { x: w / 2, y: this.centerY };
		const archive = [sun.x - 90, sun.y + this.sunR * 1.5, sun.x + 90, sun.y + this.sunR * 1.5 + 50];
		// The orbit lines as close-set points.
		const lines: number[] = [];
		for (let i = 0; i < this.count; i++) {
			for (let a = 0; a < 200; a++) {
				const p = this.place(this.orbitRadius(i), (a / 200) * TAU, 0, 0);
				lines.push(p.x, p.y);
			}
		}
		// Inside the first orbit is the sun's own room.
		const nearSun = (x: number, y: number) => {
			let odd = false;
			for (let k = 0, j = 398; k < 400; j = k, k += 2) {
				const ay = lines[k + 1];
				const by = lines[j + 1];
				if (ay > y !== by > y && x < ((lines[j] - lines[k]) * (y - ay)) / (by - ay) + lines[k]) odd = !odd;
			}
			return odd;
		};
		const u = Math.max(this.size, 22);
		const gap = mobile ? 16 : 40;
		this.junk = [];
		for (const def of JUNK.slice(0, TUNING.debris.count)) {
			const r = u * def.size;
			const reach = r * JUNK_REACH[def.kind];
			const clear = (reach + 9) ** 2;
			// Of a dozen free spots, take the one with the most room around it.
			let x = 0;
			let y = 0;
			let most = -1;
			for (let tries = 0, found = 0; tries < 300 && found < 12; tries++) {
				const cx = reach + 14 + rnd() * (w - 2 * reach - 28);
				const cy = reach + 14 + rnd() * (h - 2 * reach - 28);
				const hits = (b: number[]) => cx + reach > b[0] && cx - reach < b[2] && cy + reach > b[1] && cy - reach < b[3];
				if (hud.some(hits) || hits(archive) || nearSun(cx, cy)) continue;
				let room = Infinity;
				for (const j of this.junk) room = Math.min(room, Math.hypot(j.x - cx, j.y - cy) - j.reach - reach);
				for (const d of this.doodles) room = Math.min(room, Math.hypot(d.x - cx, d.y - cy) - d.r - reach);
				if (room < gap) continue;
				let onLine = false;
				for (let k = 0; k < lines.length && !onLine; k += 2) onLine = (lines[k] - cx) ** 2 + (lines[k + 1] - cy) ** 2 < clear;
				if (onLine) continue;
				found++;
				if (room > most) {
					most = room;
					x = cx;
					y = cy;
				}
			}
			if (most < 0) continue;
			const toSun = Math.atan2(sun.y - y, sun.x - x);
			this.junk.push({
				kind: def.kind,
				x,
				y,
				r,
				reach,
				color: def.color,
				// A comet's tail points away from the sun; everything else lands at any angle.
				rot: def.kind === 'comet' ? toSun + Math.PI : def.spin ? rnd() * TAU : 0,
				spin: def.spin,
				far: def.far,
				phase: rnd() * TAU,
				fade: 1,
				sy: 0,
				w: Math.ceil(2 * reach + 6),
				h: Math.ceil(def.kind === 'comet' ? r * 2.2 + 6 : 2 * reach + 6),
				lx: Math.cos(toSun),
				ly: Math.sin(toSun),
			});
		}
	}

	// Each piece is drawn once per boil frame (three of them, side by side) onto the sprite sheet.
	private drawJunkSheet(dpr: number) {
		const sheet = this.junkSheet;
		this.junkDpr = dpr;
		this.junkCell = 0;
		let y = 0;
		for (const j of this.junk) {
			j.sy = y;
			y += j.h;
			this.junkCell = Math.max(this.junkCell, j.w);
		}
		sheet.width = Math.max(1, Math.ceil(this.junkCell * 3 * dpr));
		sheet.height = Math.max(1, Math.ceil(y * dpr));
		const g = sheet.getContext('2d')!;
		g.setTransform(dpr, 0, 0, dpr, 0, 0);
		g.lineCap = 'round';
		g.lineJoin = 'round';
		this.junk.forEach((j, k) => {
			for (let v = 0; v < 3; v++) {
				g.save();
				g.translate(v * this.junkCell + j.w / 2, j.sy + j.h / 2);
				this.junkShape(g, j, k * 5.1 + v * 2.7);
				g.restore();
			}
		});
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
		const phi = this.turn + this.swing + leanX * 0.05;
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
		// Small shapes wobble by at least the 0.7px a hand does on a big one, so they don't come out as perfect circles.
		const amt = Math.max(TUNING.wobble, Math.min(0.12, 0.7 / Math.max(rx, ry, 1)));
		const path = new Path2D();
		const c = Math.cos(rot);
		const s = Math.sin(rot);
		for (let k = 0; k <= steps; k++) {
			const a = from + ((to - from) * k) / steps;
			const m = 1 + amt * noise(a, seed);
			const px = Math.cos(a) * rx * m;
			const py = Math.sin(a) * ry * m;
			const X = x + px * c - py * s;
			const Y = y + px * s + py * c;
			if (k === 0) path.moveTo(X, Y);
			else path.lineTo(X, Y);
		}
		return path;
	}

	private hatch(x: number, y: number, r: number, angle: number, gap: number, seed = this.seed) {
		const path = new Path2D();
		const c = Math.cos(angle);
		const s = Math.sin(angle);
		let side = -1;
		for (let d = -r; d <= r; d += gap) {
			const j = noise(d * 0.21, seed) * r * 0.08;
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
		this.doodles.forEach((d, k) => {
			const tw = 1 + 0.18 * Math.sin(time * 1.6 + d.phase);
			const r = d.r * tw * (this.ink < 0 ? 1 : easeOut(clamp01((this.ink - 0.25 - k * 0.05) / 0.35)));
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
				// Two quick strokes, each bowed a little.
				ctx.moveTo(d.x - r, d.y + j);
				ctx.quadraticCurveTo(d.x, d.y + 0.7 - j * 0.4, d.x + r, d.y - j);
				ctx.moveTo(d.x + j, d.y - r);
				ctx.quadraticCurveTo(d.x - 0.7 + j * 0.4, d.y, d.x - j, d.y + r);
			} else {
				// A small loop that runs on past where it started.
				const rr = r * 0.35;
				const rot = d.phase + j * 0.5;
				ctx.ellipse(d.x + j, d.y, rr * 1.15, rr * 0.88, rot, 0, TAU * 0.86);
				ctx.ellipse(d.x + j + 0.4, d.y - 0.3, rr * 1.28, rr * 0.98, rot, TAU * 0.86, TAU * 1.1);
			}
			ctx.stroke();
		});
		ctx.strokeStyle = TUNING.ink;
		ctx.globalAlpha = 1;
	}

	// Stamps the junk from its sprite sheet: it bobs, turns slowly and shifts against the pointer, boiling with the rest.
	private drawJunk(f: SolarFrame, alpha: number, dt: number) {
		if (!this.junk.length || alpha < 0.01) return;
		const { ctx, junkDpr: dpr, labelBoxes } = this;
		const { drift, depth } = TUNING.debris;
		const t = f.time;
		const v = this.calm ? 0 : this.boilStep % 3;
		this.junk.forEach((j, k) => {
			const x = j.x + Math.sin(t * 0.13 + j.phase) * drift - f.leanX * depth * j.far;
			const y = j.y + Math.cos(t * 0.1 + j.phase * 1.3) * drift * 0.7 - f.leanY * depth * j.far * 0.7;
			// It ducks out of sight while a planet's label passes over it (the boxes are from the frame before).
			const m = j.reach + 6;
			let clear = 1;
			for (const b of labelBoxes) if (x + m > b[0] && x - m < b[2] && y + m > b[1] && y - m < b[3]) clear = 0;
			j.fade = this.calm ? clear : j.fade + (clear - j.fade) * Math.min(1, dt * 5);
			const pop = this.ink < 0 ? 1 : easeOut(clamp01((this.ink - 0.45 - k * 0.06) / 0.4));
			if (pop <= 0 || j.fade < 0.01) return;
			ctx.globalAlpha = alpha * TUNING.debris.alpha * j.far * j.fade;
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(j.rot + t * j.spin);
			if (pop < 1) ctx.scale(pop, pop);
			ctx.drawImage(this.junkSheet, (v * this.junkCell) * dpr, j.sy * dpr, j.w * dpr, j.h * dpr, -j.w / 2, -j.h / 2, j.w, j.h);
			ctx.restore();
		});
		ctx.globalAlpha = 1;
	}

	// A closed wobbly loop about the origin: `lump` gives it a lasting rocky shape (from `shape`), `seed` the boil.
	private blob(rx: number, ry: number, lump: number, shape: number, seed: number) {
		const path = new Path2D();
		for (let k = 0; k < 30; k++) {
			const a = (k / 30) * TAU;
			const m = 1 + lump * noise(a, shape) + 0.04 * noise(a * 2, seed);
			if (k === 0) path.moveTo(Math.cos(a) * rx * m, Math.sin(a) * ry * m);
			else path.lineTo(Math.cos(a) * rx * m, Math.sin(a) * ry * m);
		}
		path.closePath();
		return path;
	}

	// Draws one piece of junk about the origin onto the sprite sheet; `seed` changes from one boil frame to the next.
	private junkShape(g: CanvasRenderingContext2D, j: Junk, seed: number) {
		const { r, lx, ly } = j;
		const lw = Math.min(1.9, Math.max(1.3, this.size * 0.055));
		const fill = j.color < 0 ? TUNING.debris.stone : TUNING.markers[j.color % TUNING.markers.length];
		g.strokeStyle = TUNING.ink;
		g.fillStyle = TUNING.ink;
		// Scribbled shade on the side away from the sun.
		const shade = (body: Path2D, rr: number) => {
			g.save();
			g.clip(body);
			const dark = new Path2D();
			dark.arc(0, 0, rr * 1.4, 0, TAU);
			dark.arc(lx * rr * 0.5, ly * rr * 0.5, rr * 1.12, 0, TAU);
			g.clip(dark, 'evenodd');
			g.lineWidth = lw * 0.6;
			g.stroke(this.hatch(0, 0, rr * 1.2, Math.atan2(ly, lx) + Math.PI / 2 + 0.6, Math.max(2.2, rr * 0.24), seed));
			g.restore();
		};
		// A little round planet: marker fill, a pattern, shade, and an outline drawn twice by a quick hand.
		const ball = (detail: () => void) => {
			const body = this.blob(r, r, 0, 0, seed);
			g.fillStyle = fill;
			g.fill(body);
			g.save();
			g.clip(body);
			g.fillStyle = TUNING.ink;
			g.lineWidth = lw * 0.7;
			detail();
			g.restore();
			shade(body, r);
			g.lineWidth = lw;
			g.stroke(body);
			const start = (seed * 2.3) % TAU;
			g.globalAlpha = 0.7;
			g.lineWidth = lw * 0.6;
			g.stroke(this.wobblePath(r * 0.03, -r * 0.03, r * 1.05, r * 1.05, 0, seed + 31, start, start + TAU - 0.8));
			g.globalAlpha = 1;
		};
		switch (j.kind) {
			case 'ringed': {
				const rot = -0.35;
				const half = (front: boolean) => {
					const from = front ? 0 : Math.PI;
					const c = Math.cos(rot);
					const s = Math.sin(rot);
					const band = new Path2D();
					const arc = (rad: number, a0: number, a1: number) => {
						for (let k = 0; k <= 20; k++) {
							const a = a0 + ((a1 - a0) * k) / 20;
							const px = Math.cos(a) * rad;
							const py = Math.sin(a) * rad * 0.3;
							band.lineTo(px * c - py * s, px * s + py * c);
						}
					};
					arc(r * 1.85, from, from + Math.PI);
					arc(r * 1.3, from + Math.PI, from);
					band.closePath();
					g.fillStyle = TUNING.paper;
					g.fill(band);
					g.globalAlpha = 0.5;
					g.fillStyle = fill;
					g.fill(band);
					g.globalAlpha = 1;
					g.lineWidth = lw * 0.85;
					g.stroke(this.wobblePath(0, 0, r * 1.85, r * 1.85 * 0.3, rot, seed + 3, from, from + Math.PI));
					g.stroke(this.wobblePath(0, 0, r * 1.3, r * 1.3 * 0.3, rot, seed + 5, from, from + Math.PI));
				};
				half(false);
				ball(() => {
					for (let gy = -0.6; gy <= 0.6; gy += 0.4) {
						for (let gx = -0.7; gx <= 0.7; gx += 0.35) {
							g.beginPath();
							g.arc((gx + (Math.round(gy / 0.4) % 2) * 0.17) * r, gy * r, r * 0.07, 0, TAU);
							g.fill();
						}
					}
				});
				half(true);
				break;
			}
			case 'craters':
				ball(() => {
					for (const [cx, cy, cr] of [
						[-0.35, -0.25, 0.26],
						[0.32, 0.12, 0.18],
						[-0.08, 0.48, 0.15],
					]) {
						g.stroke(this.wobblePath(cx * r, cy * r, cr * r, cr * r * 0.75, 0, seed + cx * 9));
					}
				});
				break;
			case 'stripes':
				ball(() => {
					g.rotate(0.3);
					g.lineWidth = r * 0.22;
					g.stroke(this.wave(r * 1.2, -r * 0.3, r * 0.06, 3, seed * 0.1));
					g.lineWidth = lw * 0.7;
					g.stroke(this.wave(r * 1.2, r * 0.25, r * 0.05, 3, 1 + seed * 0.1));
					g.stroke(this.wave(r * 1.2, r * 0.6, r * 0.05, 3, 2 + seed * 0.1));
				});
				break;
			case 'rock': {
				const body = this.blob(r, r * 0.78, 0.22, j.phase * 10, seed);
				g.fillStyle = fill;
				g.fill(body);
				shade(body, r);
				// One pit and a crack running in from the edge.
				g.lineWidth = lw * 0.7;
				g.stroke(this.wobblePath(-r * 0.25, -r * 0.12, r * 0.22, r * 0.16, 0.3, seed));
				g.beginPath();
				g.moveTo(r * 0.85, r * 0.05);
				g.lineTo(r * 0.5, r * (0.18 + 0.04 * noise(1, seed)));
				g.lineTo(r * 0.32, r * 0.02);
				g.lineTo(r * 0.12, r * (0.26 + 0.04 * noise(2, seed)));
				g.stroke();
				g.lineWidth = lw;
				g.stroke(body);
				break;
			}
			case 'nut': {
				const hex = new Path2D();
				for (let k = 0; k < 6; k++) {
					const a = (k / 6) * TAU;
					const m = 1 + 0.06 * noise(a * 3, seed);
					hex.lineTo(Math.cos(a) * r * m, Math.sin(a) * r * m);
				}
				hex.closePath();
				g.fillStyle = fill;
				g.fill(hex);
				g.lineWidth = lw;
				g.stroke(hex);
				const hole = this.blob(r * 0.42, r * 0.42, 0, 0, seed);
				g.fillStyle = TUNING.paper;
				g.fill(hole);
				g.stroke(hole);
				break;
			}
			case 'satellite': {
				const quad = (x0: number, y0: number, x1: number, y1: number, s: number) => {
					const p = new Path2D();
					const n = (k: number) => noise(k * 1.7 + s, seed) * 0.7;
					p.moveTo(x0 + n(1), y0 + n(2));
					p.lineTo(x1 + n(3), y0 + n(4));
					p.lineTo(x1 + n(5), y1 + n(6));
					p.lineTo(x0 + n(7), y1 + n(8));
					p.closePath();
					return p;
				};
				g.lineWidth = lw * 0.8;
				g.beginPath();
				g.moveTo(-r * 0.75, 0);
				g.lineTo(r * 0.75, 0);
				g.moveTo(0, -r * 0.4);
				g.lineTo(r * 0.25, -r * 1.0);
				g.stroke();
				g.save();
				g.translate(r * 0.29, -r * 1.12);
				g.fill(this.blob(r * 0.17, r * 0.13, 0.15, 2, seed));
				g.restore();
				for (const side of [-1, 1]) {
					const x0 = side < 0 ? -r * 2 : r * 0.72;
					const panel = quad(x0, -r * 0.42, x0 + r * 1.28, r * 0.42, side * 3);
					g.fillStyle = fill;
					g.fill(panel);
					g.lineWidth = lw;
					g.stroke(panel);
					g.lineWidth = lw * 0.55;
					g.beginPath();
					for (const k of [1 / 3, 2 / 3]) {
						g.moveTo(x0 + r * 1.28 * k, -r * 0.42);
						g.lineTo(x0 + r * 1.28 * k, r * 0.42);
					}
					g.moveTo(x0, 0);
					g.lineTo(x0 + r * 1.28, 0);
					g.stroke();
				}
				const box = quad(-r * 0.42, -r * 0.42, r * 0.42, r * 0.42, 9);
				g.fillStyle = TUNING.paper;
				g.fill(box);
				g.lineWidth = lw;
				g.stroke(box);
				break;
			}
			case 'comet': {
				// Head at one end, a tail of loops trailing off toward +x that shrink to a wave.
				const len = r * 8;
				const hx = -(2 * r + len) / 2 + r;
				g.lineWidth = lw * 0.7;
				const tail = new Path2D();
				for (let k = 0; k <= 90; k++) {
					const t = k / 90;
					const th = t * (r < 7 ? 3 : 4) * TAU + noise(t * 4, seed) * 0.4;
					const b = r * 0.85 * (1 - 0.75 * t);
					const px = hx + r * 0.5 + t * (len - r * 0.4) - Math.sin(th) * b * 0.8;
					const py = -Math.cos(th) * b;
					if (k === 0) tail.moveTo(px, py);
					else tail.lineTo(px, py);
				}
				g.stroke(tail);
				g.beginPath();
				for (const s of [-1, 1]) {
					g.moveTo(hx + r * 0.2, s * r * 0.98);
					g.quadraticCurveTo(hx + len * 0.4, s * r * (0.9 + 0.05 * noise(s, seed)), hx + r + len, s * r * 0.12);
				}
				g.stroke();
				const head = this.blob(r, r, 0, 0, seed);
				g.translate(hx, 0);
				g.fillStyle = TUNING.sun;
				g.fill(head);
				g.lineWidth = lw;
				g.stroke(head);
				break;
			}
		}
	}

	private shade(b: ScreenDisc, lx: number, ly: number) {
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
					ctx.stroke(this.wobblePath(px * r, cy * r, cr * r, cr * r * 0.75, 0, this.seed + cx * 9));
					ctx.stroke(
						this.wobblePath(
							px * r + cr * r * 0.15,
							cy * r + cr * r * 0.12,
							cr * r * 0.6,
							cr * r * 0.4,
							0,
							this.seed + cy * 9,
							Math.PI * 0.1,
							Math.PI * 0.9,
						),
					);
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
					ctx.stroke(
						this.wobblePath(
							0,
							0,
							Math.max(0.5, Math.abs(sh) * r),
							r,
							0,
							this.seed + k * 5,
							sh < 0 ? Math.PI / 2 : -Math.PI / 2,
							sh < 0 ? Math.PI * 1.5 : Math.PI / 2,
						),
					);
				}
				for (const k of [-0.55, 0, 0.55]) ctx.stroke(this.wave(r, k * r, r * 0.02, 2, this.seed + k * 3));
				break;
			case 'storm': {
				for (const k of [-0.68, -0.42, 0.42, 0.7]) ctx.stroke(this.wave(r, k * r, r * 0.05, 3, k * 3 + ph));
				ctx.stroke(this.wave(r, -0.12 * r, r * 0.04, 2, 2 + ph));
				const ex = wrap1(0.25 + roll * 0.6) * r;
				for (const s of [0.34, 0.22, 0.1]) ctx.stroke(this.wobblePath(ex, r * 0.12, r * s, r * s * 0.6, 0, this.seed + s * 20));
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

	// The blot of ink at the pen's tip: a little lopsided, and it shifts as the lines boil.
	private inkDot(x: number, y: number, r: number) {
		const { ctx } = this;
		ctx.beginPath();
		ctx.ellipse(x, y, r * 1.15, r * 0.85, this.seed * 1.7, 0, TAU);
		ctx.fill();
	}

	// Pen pass: how far a stroke starting `delay` seconds in has been traced, and how much it has faded since.
	private pen(delay: number, dur: number) {
		if (this.ink < 0) return null;
		const t = clamp01((this.ink - delay) / dur);
		const fade = clamp01((this.ink - delay - dur) / 0.5);
		return t > 0 && fade < 1 ? { t: easeOut(t), fade } : null;
	}

	private retrace(x: number, y: number, r: number, seed: number, delay: number, dur: number, width: number) {
		const p = this.pen(delay, dur);
		if (!p) return;
		const { ctx } = this;
		const start = (seed * 2.3) % TAU;
		const end = start + TAU * p.t;
		ctx.save();
		ctx.globalAlpha = 1 - p.fade;
		ctx.lineWidth = width;
		ctx.stroke(this.wobblePath(x, y, r * 1.04, r * 1.04, 0, seed + 5, start, end));
		if (p.t < 1) this.inkDot(x + Math.cos(end) * r * 1.04, y + Math.sin(end) * r * 1.04, Math.max(2.2, width * 0.75));
		ctx.restore();
	}

	private speedLines(b: Body) {
		const speed = Math.hypot(b.vx, b.vy);
		if (speed < 500 || b.focused > 0) return;
		const { ctx } = this;
		const ux = -b.vx / speed;
		const uy = -b.vy / speed;
		const len = Math.min(b.r * 2.4, speed * 0.04);
		ctx.globalAlpha = b.alpha * clamp01((speed - 500) / 1400);
		ctx.lineWidth = 2;
		for (const off of [-0.6, 0, 0.6]) {
			const px = b.x + ux * b.r * 1.3 - uy * off * b.r;
			const py = b.y + uy * b.r * 1.3 + ux * off * b.r;
			const l = len * (off ? 0.7 : 1);
			ctx.beginPath();
			ctx.moveTo(px, py);
			ctx.lineTo(px + ux * l, py + uy * l);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}

	// A moon drawn by hand like its planet: a boiling outline gone over twice, paper tinted with the planet's
	// marker, a crater and a scribbled shadow on the side away from the sun.
	private moon(b: Body, k: number, moons: number, time: number, behind: boolean) {
		const a = time * 0.6 + (k / moons) * TAU;
		if (Math.sin(a) < 0 !== behind) return;
		const { ctx } = this;
		const dist = moons === 3 ? 1.75 : 1.9 + k * 0.5;
		const mr = b.r * (moons === 3 ? 0.14 : 0.2);
		const x = b.x + Math.cos(a) * dist * b.r;
		const y = b.y + Math.sin(a) * dist * b.r * 0.35;
		const seed = this.seed + k * 3.7;
		const body = this.wobblePath(x, y, mr, mr, 0, seed);
		ctx.fillStyle = TUNING.paper;
		ctx.fill(body);
		ctx.globalAlpha = b.alpha * 0.4;
		ctx.fillStyle = this.colorOf(b.i);
		ctx.fill(body);
		ctx.globalAlpha = b.alpha;
		const sx = this.sunDisc.x - x;
		const sy = this.sunDisc.y - y;
		const sl = Math.hypot(sx, sy) || 1;
		ctx.save();
		ctx.clip(body);
		this.shade({ x, y, r: mr }, sx / sl, sy / sl);
		ctx.restore();
		ctx.lineWidth = Math.max(0.8, mr * 0.12);
		ctx.stroke(this.wobblePath(x + (sx / sl) * mr * 0.3, y + (sy / sl) * mr * 0.3 - mr * 0.15, mr * 0.28, mr * 0.2, 0, seed + 6));
		ctx.lineWidth = TUNING.outline * 0.85;
		ctx.stroke(body);
		const start = (seed * 2.3) % TAU;
		ctx.globalAlpha = b.alpha * 0.7;
		ctx.lineWidth = TUNING.outline * 0.4;
		ctx.stroke(this.wobblePath(x + mr * 0.05, y - mr * 0.06, mr * 1.08, mr * 1.08, 0, seed + 31, start, start + TAU - 1));
		ctx.globalAlpha = b.alpha;
	}

	private drawPlanet(b: Body, time: number) {
		if (b.r < 1) return;
		const { ctx } = this;
		const look = LOOKS[b.i % LOOKS.length];
		const sx = this.sunDisc.x - b.x;
		const sy = this.sunDisc.y - b.y;
		const sl = Math.hypot(sx, sy) || 1;
		this.speedLines(b);
		// Squash and stretch along the direction it is flying.
		const stretch = Math.min(0.3, Math.hypot(b.vx, b.vy) / 3000);
		const squash = stretch > 0.01;
		if (squash) {
			const ang = Math.atan2(b.vy, b.vx);
			ctx.save();
			ctx.translate(b.x, b.y);
			ctx.rotate(ang);
			ctx.scale(1 + stretch, 1 / (1 + stretch));
			ctx.rotate(-ang);
			ctx.translate(-b.x, -b.y);
		}
		ctx.globalAlpha = b.alpha;
		this.ring(b, look, false);
		// Moons on the far side of their swing go behind the planet.
		const moons = look.moons ?? 0;
		for (let k = 0; k < moons; k++) this.moon(b, k, moons, time, true);

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
		for (let k = 0; k < moons; k++) this.moon(b, k, moons, time, false);
		ctx.fillStyle = TUNING.ink;
		ctx.globalAlpha = 1;
		if (squash) ctx.restore();
		this.retrace(b.x, b.y, b.r, this.seed + b.i * 1.7, 0.4 + b.i * 0.13, 0.55, TUNING.outline * 2.2);
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
			const len = r * (1.42 + 0.12 * Math.sin(time * 1.4 + k * 1.9) + (k % 2) * 0.1 + 0.03 * noise(k, this.seed));
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
			const rad = r * (0.35 + k * 0.2);
			const from = -0.2 + time * 0.1 * dir;
			ctx.stroke(this.wobblePath(x - r * 0.1, y + r * 0.1, rad, rad, 0, this.seed + 13 + k * 2, from, from + 1.8));
		}
		ctx.restore();
		this.sketch(x, y, r, this.seed + 11, TUNING.outline * 1.2);
		ctx.fillStyle = TUNING.ink;
		ctx.globalAlpha = 1;
		this.retrace(x, y, r, this.seed + 11, 0, 0.6, TUNING.outline * 2.4);
	}

	render(f: SolarFrame, now: number) {
		const { ctx, w, h } = this;
		if (TUNING.boil > 0 && now - this.lastBoil > 1000 / TUNING.boil) {
			this.lastBoil = now;
			this.seed = (this.seed + 1.618) % 100;
			this.boilStep++;
		}
		ctx.clearRect(0, 0, w, h);
		const dt = this.lastNow ? Math.min(0.05, Math.max(0, (now - this.lastNow) / 1000)) : 0;
		this.lastNow = now;
		this.ink = f.ink;
		this.swing = f.turn;
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
		const sunR = this.sunR * (1 - Math.pow(1 - Math.min(1, e * 1.6), 3)) * (1 + 0.1 * f.sunHover);
		this.sunDisc = { x: sunP.x, y: sunP.y, r: sunR * sunP.s };

		this.drawDoodles(f.time, e * (1 - 0.6 * fa));
		this.drawJunk(f, e * (1 - 0.7 * fa), dt);
		const orbitAlpha = 0.34 * e * (1 - 0.75 * fa);
		ctx.lineWidth = 1.2;
		ctx.setLineDash([12, 7, 3, 7]);
		const traces: { pts: { x: number; y: number }[]; t: number; fade: number }[] = [];
		for (let i = 0; i < this.count; i++) {
			const r = this.orbitRadius(i) * (0.35 + 0.65 * e);
			const path = new Path2D();
			const pts: { x: number; y: number }[] = [];
			for (let k = 0; k <= 96; k++) {
				const p = this.place(r * (1 + 0.004 * noise((k / 96) * TAU, this.seed + i)), (k / 96) * TAU, f.leanX, f.leanY);
				pts.push(p);
				if (k === 0) path.moveTo(p.x, p.y);
				else path.lineTo(p.x, p.y);
			}
			ctx.globalAlpha = Math.min(1, orbitAlpha * (f.hover === i ? 1 + f.hoverAmt * 1.4 : 1));
			ctx.stroke(path);
			const pen = this.pen(0.1 + i * 0.13, 0.85);
			if (pen) traces.push({ pts, ...pen });
		}
		ctx.setLineDash([]);
		// The pen pass inks each orbit once over its dashes, then lets the ink fade back.
		for (const { pts, t, fade } of traces) {
			const n = Math.max(1, Math.round(96 * t));
			ctx.globalAlpha = 0.85 * (1 - fade);
			ctx.lineWidth = 2.2;
			ctx.beginPath();
			for (let k = 0; k <= n; k++) {
				if (k === 0) ctx.moveTo(pts[k].x, pts[k].y);
				else ctx.lineTo(pts[k].x, pts[k].y);
			}
			ctx.stroke();
			if (t < 1) this.inkDot(pts[n].x, pts[n].y, 2.8);
		}
		ctx.lineWidth = 1.2;
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
			const focused = f.focus === i ? f.focusAmt : 0;
			const o = this.stepFling(i, p.x, p.y, dt);
			let x = p.x + o.x * (1 - focused);
			let y = p.y + o.y * (1 - focused);
			let radius = this.size * look.size * grow * p.s * (1 + hover * 0.16);
			let z = p.z;
			if (focused > 0) {
				x += (target.x - x) * focused;
				y += (target.y - y) * focused;
				radius += (target.r * look.size ** 0.3 - radius) * focused;
				z += (this.dist - z) * focused * 0.5;
			}
			this.bodies.push({
				x,
				y,
				r: radius,
				z,
				i,
				alpha: grow * (focused > 0 ? 1 : 1 - 0.78 * fa),
				hover,
				focused,
				vx: o.vx * (1 - focused),
				vy: o.vy * (1 - focused),
			});
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
		this.labelBoxes.length = 0;
		const hits = (box: number[], other: number[]) =>
			box[0] < other[2] && box[2] > other[0] && box[1] < other[3] && box[3] > other[1];
		if (this.sunLabel) {
			const lw = this.sunLabel.offsetWidth || 120;
			const top = sun.y + sun.r * 1.55 + 4;
			taken.push([sun.x - lw / 2 - 4, top + 3, sun.x + lw / 2 + 4, top + 33]);
			const show = (1 - fa) * on;
			this.sunLabelA += (show - this.sunLabelA) * 0.12;
			this.sunLabel.style.transform = `translate3d(${sun.x}px, ${top}px, 0) translateX(-50%)`;
			this.sunLabel.style.opacity = String(this.sunLabelA);
		}
		for (const b of order) {
			const label = this.labels[b.i];
			if (!label) continue;
			const look = LOOKS[b.i % LOOKS.length];
			const lw = (this.labelW[b.i] ||= label.offsetWidth || 80);
			const lh = 36;
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
			if (this.labelA[b.i] > 0.05) this.labelBoxes.push(box);
			label.classList.toggle('is-hover', b.hover > 0.5);
		}
	}

	get centerY() {
		return this.h / 2 + this.offY;
	}

	// A planet held by the pointer follows it; let go, it springs back to its place on the orbit.
	private stepFling(i: number, ox: number, oy: number, dt: number) {
		const o = (this.flings[i] ??= { x: 0, y: 0, vx: 0, vy: 0 });
		if (this.held === i) {
			const a = 1 - Math.exp(-30 * dt);
			const nx = o.x + (this.handX + this.grabX - ox - o.x) * a;
			const ny = o.y + (this.handY + this.grabY - oy - o.y) * a;
			if (dt > 0) {
				o.vx += ((nx - o.x) / dt - o.vx) * 0.5;
				o.vy += ((ny - o.y) / dt - o.vy) * 0.5;
			}
			o.x = nx;
			o.y = ny;
		} else if (o.x || o.y || o.vx || o.vy) {
			const k = TUNING.fling.stiffness;
			const c = this.calm ? 2 * Math.sqrt(k) : TUNING.fling.damping;
			const h = dt / 3;
			for (let s = 0; s < 3; s++) {
				o.vx += (-k * o.x - c * o.vx) * h;
				o.vy += (-k * o.y - c * o.vy) * h;
				o.x += o.vx * h;
				o.y += o.vy * h;
			}
			if (Math.abs(o.x) + Math.abs(o.y) < 0.2 && Math.abs(o.vx) + Math.abs(o.vy) < 4) o.x = o.y = o.vx = o.vy = 0;
		}
		const speed = Math.hypot(o.vx, o.vy);
		if (speed > 3500) {
			o.vx *= 3500 / speed;
			o.vy *= 3500 / speed;
		}
		return o;
	}

	grab(i: number, x: number, y: number) {
		const b = this.bodies.find((o) => o.i === i);
		if (!b) return false;
		this.held = i;
		this.grabX = b.x - x;
		this.grabY = b.y - y;
		this.handX = x;
		this.handY = y;
		return true;
	}

	moveHand(x: number, y: number) {
		this.handX = x;
		this.handY = y;
	}

	release() {
		this.held = -1;
	}

	patternOf(i: number) {
		return LOOKS[i % LOOKS.length].pattern;
	}

	colorOf(i: number) {
		return TUNING.markers[LOOKS[i % LOOKS.length].color % TUNING.markers.length];
	}

	overSun(x: number, y: number) {
		const sun = this.sunDisc;
		return sun.r > 1 && Math.hypot(x - sun.x, y - sun.y) < sun.r * 1.2;
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
