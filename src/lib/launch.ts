// The trip between the meadow and the work. Up: he turns, walks over to the rocket, climbs the stairs and
// ducks in, the hatch shuts, he gives a thumbs-up from the porthole, the engine lights, the rocket squats
// and leaps off with the camera following a beat late, then noses over into a corner of the solar system
// and keeps flying. Down: it stands on its tail, the camera drops back to the meadow, the burn slows it to a
// squashy touchdown, and he climbs out and walks back to his spot. Everything is a function of the time into
// a trip, so a trip can be hurried and every frame is reproducible.
import { Actor, Face } from './actor';
import { FaceDom, HungDom, LEG, rest, type Pose } from './hung';

export type Phase = 'ground' | 'up' | 'space' | 'down';
// The two grounds the rocket stands on: the meadow (home) and the off-duty moon past the work.
export type Place = 'meadow' | 'moon';
export type Stop = Place | 'space';

// The rocket's door, stairs, porthole and nozzle in its own units (the character's, at his full size).
export const ROCKET = {
	door: { x0: -42, x1: 42, top: -304, sill: -118, r: 42 },
	treads: [-40, -80, -118],
	port: { y: -392, r: 42, face: -346, scale: 0.6, thumb: { x: -24, y: -370 } },
	nozzle: -84,
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t * t * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
// A bump that rises and falls back over [a, b].
const pulse = (t: number, a: number, b: number) => Math.sin(Math.PI * seg(t, a, b));

interface Plant {
	x: number;
	y: number;
	k: number;
}

interface Step {
	foot: 0 | 1;
	to: Plant;
	t0: number;
	t1: number;
	lift: number;
	// Side steps roll the foot from heel to toe and swing the arms; flat steps (front, back, stairs) lift it.
	side: boolean;
}

// A side-on step: how far apart his feet are as one lands, in his own units, and how high the swinging foot clears
// the floor. The foot comes up behind him as the knee folds early in the swing; lifted later, under him, it would
// raise the knee in front and he would march.
const STRIDE = 120;
const STRIDE_LIFT = 26;
// The share of a side-on step the back foot stays down, its heel rising, while the front one takes his weight.
const HEEL_OFF = 0.16;
// Of the rise between his feet on a walk into the distance, the share left for his knees; the rest foreshortens
// the far leg (Foot.reach), or every step would read as one up a stair.
const SLOPE = 0.35;

// Where to plant the side-on steps of a walk whose depth scale runs from 1 to `k` over `px` across: evenly in his
// own units, so a step further off is shorter on screen (he is smaller there), and as many as keep each near a
// STRIDE. Each is the fraction of the way it lands at.
function strides(px: number, U: number, k: number) {
	const len = (px / U) * (k === 1 ? 1 : Math.log(1 / k) / (1 - k));
	const n = clamp(Math.round(len / STRIDE), 2, 6);
	return Array.from({ length: n }, (_, i) => (k === 1 ? (i + 1) / n : (1 - k ** ((i + 1) / n)) / (1 - k)));
}

interface RocketPose {
	x: number;
	y: number;
	angle: number;
	scale: number;
}

// Up and down, in seconds from the start of the trip.
const UP = {
	turn: [0, 0.16],
	walk: [0.16, 1.4],
	face: [1.4, 1.5],
	climb: [1.5, 2.04],
	enter: [2.04, 2.28],
	doorOpen: [0.86, 1.21],
	doorShut: [2.24, 2.48],
	stairs: [2.38, 2.7],
	port: [2.44, 2.72],
	thumb: [2.64, 2.82],
	thumbDown: [3.31, 3.46],
	ignite: [2.96, 3.41],
	squat: [3.28, 3.46],
	lift: [3.41, 4.51],
	cam: [3.6, 4.51],
	arrive: [4.31, 5.06],
	end: 5.06,
};

const OUT = 2.16;
const DOWN = {
	stand: [0, 0.42],
	cam: [0.26, 1.46],
	descend: [0.34, 1.5],
	blast: [1.08, 1.6],
	touch: 1.5,
	cutoff: [1.56, 1.86],
	portOff: [1.6, 1.74],
	stairs: [1.82, 2.08],
	door: [1.9, 2.16],
	stairsDown: [OUT, OUT + 0.74],
	turn: [OUT + 0.74, OUT + 0.84],
	walk: [OUT + 0.84, OUT + 2.08],
	face: [OUT + 2.08, OUT + 2.18],
	doorShut: [OUT + 0.9, OUT + 1.16],
	end: OUT + 2.22,
};

// A sparse grid over the hull and nose (rocket units) for veilPoints().
const VEIL: [number, number][] = [
	[0, -566],
	[0, -500],
	[-60, -470],
	[60, -470],
	[0, -430],
	[-90, -390],
	[90, -390],
	[0, -392],
	[-95, -320],
	[0, -320],
	[95, -320],
	[-90, -250],
	[0, -250],
	[90, -250],
	[-75, -170],
	[0, -170],
	[75, -170],
];

// On the moon he never sets foot outside: a docking tube runs out from the base to the rocket and the camera
// goes in through the dome's window to his room, where he walks in from the airlock (and back out again).
const MOON_IN = {
	tube: [1.85, 2.25],
	portOff: [2.25, 2.4],
	zoom: [2.35, 3.15],
	room: [2.75, 3.15],
	walk: [3.15, 4.29],
	face: [4.29, 4.39],
	end: 4.44,
};
const MOON_OUT = { walk: [0.1, 1.24], gone: 1.29, zoom: [1.29, 2.09], room: [1.29, 1.69], tube: [2.09, 2.44] };
// How far the camera pushes in through the window before the room fills the screen.
const ZOOM = 7;
// The airlock in his room, in his units from his spot (Base.astro), and how far back it stands.
const AIRLOCK = { dx: -360, dy: 96, k: 0.85 };

// How big he is at the foot of the rocket, which is further from the camera.
const FAR = 0.42;

interface Puff {
	el: SVGGElement;
	born: number;
	life: number;
	x: number;
	y: number;
	vx: number;
	vy: number;
	r0: number;
	r1: number;
	alive: boolean;
}

export interface LaunchEls {
	hung: HTMLElement;
	rocket: HTMLElement;
	pad: HTMLElement;
	smoke: SVGSVGElement;
	ground: HTMLElement[];
	sky: HTMLElement[];
	moon: HTMLElement;
	base: HTMLElement;
}

type Styled = Element & ElementCSSInlineStyle;

export class Launch {
	phase: Phase = 'ground';
	// The ground he is on, or the one this trip leaves from or lands on.
	place: Place = 'meadow';
	readonly actor: Actor;
	// How far the solar system sits from its resting place (px): a screen and a bit above the meadow, a
	// screen and a bit to the left of the moon.
	sysX = 0;
	sysY = -1e4;
	// 0 on the meadow, 1 in space.
	progress = 0;
	intro = 0;
	// Seconds since the camera reached the system on this trip, for its pen pass; below 0 otherwise.
	inkAge = -1;
	onHome: ((place: Place) => void) | null = null;

	private dom: HungDom;
	private portFace: FaceDom;
	private port = new Face();
	private parts: Record<string, Styled>;
	private flames: SVGElement[];
	private puffs: Puff[];
	private t = 0;
	private speed = 1;
	private clock = 0;
	private w = 1;
	private h = 1;
	private U = 1;
	private F = { x: 0, y: 0 };
	private R = { x: 0, y: 0 };
	private P = 1;
	private Q = 1;
	private dome = { x: 0, y: 0 };
	private fold = 1;
	private outpost: { el: HTMLElement; tube: SVGGElement; body: SVGRectElement; folds: SVGPathElement };
	private steps: Step[] = [];
	private start: [Plant, Plant] = [
		{ x: 0, y: 0, k: 1 },
		{ x: 0, y: 0, k: 1 },
	];
	private introAt = -1;
	private arriveAt = -1;
	private spawnDebt = 0;
	private flick = 0;
	private flickAt = 0;
	private flickScale = 1;
	private shakeAt = 0;
	private shake = { x: 0, y: 0 };
	private last: Record<string, string> = {};
	private shown = true;
	// Where he stands, as px from his spot (F), and the stroll taking him somewhere else, if any.
	private spot = 0;
	private stroll: { t: number; end: number; flip: boolean; to: number; done?: () => void } | null = null;
	// Where the room's airlock is on screen.
	private get airlock() {
		return { x: this.F.x + AIRLOCK.dx * this.U * this.fold, y: this.F.y - AIRLOCK.dy * this.U, k: AIRLOCK.k };
	}

	private get downEnd() {
		return this.place === 'moon' ? MOON_IN.end : DOWN.end;
	}
	private idleDt = 1;
	private headAt = { x: 0, y: 0, s: 1 };

	constructor(
		private els: LaunchEls,
		private calm: boolean,
	) {
		this.actor = new Actor(calm);
		this.dom = new HungDom(els.hung.querySelector<SVGGElement>('[data-hung]')!);
		const svg = els.rocket.querySelector('svg')!;
		this.portFace = new FaceDom(svg.querySelector('[data-port-face]')!);
		this.flames = [...svg.querySelectorAll<SVGElement>('[data-flicker]')];
		this.parts = Object.fromEntries(
			['flame', 'flame-shape', 'door-panel', 'stairs', 'port-face', 'port-thumb'].map((k) => [
				k,
				svg.querySelector<SVGGElement>(`[data-${k}]`)!,
			]),
		);
		const out = els.moon.querySelector<HTMLElement>('[data-outpost]')!;
		this.outpost = {
			el: out,
			tube: out.querySelector<SVGGElement>('[data-tube]')!,
			body: out.querySelector<SVGRectElement>('[data-tube-body]')!,
			folds: out.querySelector<SVGPathElement>('[data-tube-folds]')!,
		};
		this.puffs = [...els.smoke.querySelectorAll<SVGGElement>('[data-puff]')].map((el) => ({
			el,
			born: 0,
			life: 1,
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			r0: 1,
			r1: 1,
			alive: false,
		}));
	}

	layout(w: number, h: number) {
		this.w = w;
		this.h = h;
		const narrow = w < 768;
		this.U = (narrow ? Math.min(h * 0.36, w * 0.8) : Math.min(h * 0.56, w * 0.4)) / 480;
		this.F = { x: w * (narrow ? 0.28 : 0.42), y: h * (narrow ? 0.9 : 0.955) };
		this.R = { x: w * (narrow ? 0.68 : 0.64), y: h * 0.79 };
		this.P = h * 1.15;
		this.Q = w * 1.3;
		const U = this.U;
		const size = (el: HTMLElement, bw: number, bh: number) => {
			el.style.width = `${bw * U}px`;
			el.style.height = `${bh * U}px`;
		};
		size(this.els.hung, 300, 520);
		size(this.els.rocket, 400, 700);
		size(this.els.pad, 400, 40);
		this.els.rocket.style.transformOrigin = `${200 * U}px ${600 * U}px`;
		this.els.smoke.setAttribute('viewBox', `0 0 ${w} ${h}`);
		// The base stands left of the pad, its tube reaching the rocket's hull; the room is laid out round his spot.
		this.dome = { x: this.R.x - (narrow ? 250 : 400) * U, y: this.R.y };
		const out = this.outpost;
		out.el.style.left = `${this.dome.x - 300 * U}px`;
		out.el.style.top = `${this.dome.y - 330 * U}px`;
		out.el.style.width = `${760 * U}px`;
		out.el.style.height = `${350 * U}px`;
		const reach = Math.max(20, (this.R.x - 96 * U - this.dome.x) / U - 190);
		out.body.setAttribute('width', reach.toFixed(1));
		out.folds.setAttribute('d', Array.from({ length: Math.floor(reach / 14) }, (_, i) => `M${(198 + i * 14).toFixed(1)} -194v68`).join(''));
		this.fold = narrow ? 0.5 : 1;
		const base = this.els.base;
		base.style.setProperty('--u', `${U}px`);
		base.style.setProperty('--fx', `${this.F.x}px`);
		base.style.setProperty('--fy', `${this.F.y}px`);
		this.last = {};
		if (this.busy) this.plan();
	}

	get inSpace() {
		return this.phase === 'space';
	}

	get busy() {
		return this.phase === 'up' || this.phase === 'down';
	}

	go(to: Stop) {
		if (this.busy) return this.hurry();
		if (to === 'space' && this.phase === 'ground') this.begin('up');
		else if (to !== 'space' && this.phase === 'space') {
			this.place = to;
			this.begin('down');
		}
	}

	// Walks side-on to a spot on the floor at screen x, then faces the camera.
	strollTo(x: number, done?: () => void) {
		if (this.phase !== 'ground' || this.stroll) return;
		const from = this.F.x + this.spot;
		const dist = x - from;
		if (this.calm || Math.abs(dist) < 8) {
			this.spot = x - this.F.x;
			done?.();
			return;
		}
		const U = this.U;
		const y = this.F.y;
		const n = Math.max(2, Math.round(Math.abs(dist) / (STRIDE * U)));
		const beat = 0.38;
		const lift = STRIDE_LIFT;
		const at = (f: number, side = 0): Plant => ({ x: from + dist * f + side * 23 * U, y, k: 1 });
		const steps: Step[] = [];
		const t0 = 0.12;
		for (let i = 1; i <= n; i++) {
			steps.push({ foot: (i % 2) as 0 | 1, to: at(i / n), t0: t0 + (i - 1) * beat, t1: t0 + i * beat, lift, side: true });
		}
		const end = t0 + n * beat;
		const last = steps[steps.length - 1].foot;
		steps.push({ foot: (1 - last) as 0 | 1, to: at(1, last === 0 ? 1 : -1), t0: end - 0.05, t1: end + 0.14, lift: 12, side: false });
		steps[steps.length - 2].to = at(1, last === 0 ? -1 : 1);
		this.start = [at(0, -1), at(0, 1)];
		this.steps = steps;
		this.stroll = { t: 0, end: end + 0.2, flip: dist < 0, to: x - this.F.x, done };
	}

	// A second ask during a trip: get on with it.
	hurry() {
		if (this.busy) this.speed = 4;
	}

	private begin(phase: 'up' | 'down') {
		// A stroll cut short by a trip ends where it was heading; a trip down lands him back on his spot.
		if (this.stroll) this.spot = this.stroll.to;
		this.stroll = null;
		if (phase === 'down') this.spot = 0;
		this.phase = phase;
		this.t = this.calm ? (phase === 'up' ? UP.end : this.downEnd) : 0;
		this.speed = 1;
		this.plan();
	}

	// Footsteps for this trip, in screen px, each plant with the depth scale he has there.
	private plan() {
		const { R, U } = this;
		const F = { x: this.F.x + this.spot, y: this.F.y };
		const along = (f: number, side = 0): Plant => {
			const k = mix(1, FAR, f);
			return { x: mix(F.x, R.x, f) + side * 23 * U * k, y: mix(F.y, R.y, f), k };
		};
		const tread = (y: number, side: number, k = FAR): Plant => ({ x: R.x + side * 23 * U * k, y: R.y + y * U, k });
		const steps: Step[] = [];
		const add = (foot: 0 | 1, to: Plant, [t0, t1]: number[], lift: number, side: boolean) => steps.push({ foot, to, t0, t1, lift, side });
		const split = ([a, b]: number[], n: number) => Array.from({ length: n }, (_, i) => [a + ((b - a) * i) / n, a + ((b - a) * (i + 1)) / n]);
		const [sill, high, low] = [...ROCKET.treads].reverse();
		// Feet alternate from the left one (0, the far foot side on); a foot finishing a walk lands to its own side,
		// and the other comes alongside to square up.
		const sideOf = (foot: 0 | 1) => (foot === 0 ? -1 : 1);
		const walkTo = (path: (f: number, side?: number) => Plant, at: number[], span: number[], last: 'gone' | 'square') => {
			const walk = split(span, at.length);
			at.forEach((f, i) => {
				const foot = (i % 2) as 0 | 1;
				add(foot, path(f, last === 'square' && i === at.length - 1 ? sideOf(foot) : 0), walk[i], STRIDE_LIFT, true);
			});
			return ((at.length - 1) % 2 ? 0 : 1) as 0 | 1;
		};
		// The way back: the same plants in reverse, ending where the walk out started.
		const back = (at: number[]) => [...at.slice(0, -1).reverse(), 0];
		if (this.place === 'moon') {
			const lock = this.airlock;
			const room = (f: number, side = 0): Plant => {
				const k = mix(1, lock.k, f);
				return { x: mix(F.x, lock.x, f) + side * 23 * U * k, y: mix(F.y, lock.y, f), k };
			};
			const at = strides(Math.abs(lock.x - F.x), U, lock.k);
			if (this.phase === 'up') {
				this.start = [room(0, -1), room(0, 1)];
				walkTo(room, at, MOON_OUT.walk, 'gone');
			} else {
				this.start = [room(1), room(1)];
				const other = walkTo(room, back(at), MOON_IN.walk, 'square');
				add(other, room(0, sideOf(other)), [MOON_IN.walk[1] - 0.04, MOON_IN.face[1]], 12, false);
			}
			this.steps = steps;
			return;
		}
		const at = strides(Math.abs(R.x - F.x), U, FAR);
		if (this.phase === 'up') {
			this.start = [along(0, -1), along(0, 1)];
			// Square up at the foot of the stairs: the back foot comes alongside as he turns his back; the other one
			// takes the first stair.
			const other = walkTo(along, at, UP.walk, 'square');
			add(other, along(1, sideOf(other)), UP.face, 14, false);
			const a = (1 - other) as 0 | 1;
			const b = other;
			const climb = split(UP.climb, 3);
			add(a, tread(low, sideOf(a)), climb[0], 44, false);
			add(b, tread(high, sideOf(b)), climb[1], 44, false);
			add(a, tread(sill, sideOf(a)), climb[2], 44, false);
			add(b, tread(sill - 8, 0.6 * sideOf(b), FAR * 0.9), UP.enter, 30, false);
		} else {
			this.start = [tread(sill - 8, -0.6, FAR * 0.9), tread(sill - 8, 0.6, FAR * 0.9)];
			const down = split(DOWN.stairsDown, 4);
			add(0, tread(sill, -1), down[0], 26, false);
			add(1, tread(high, 1), down[1], 38, false);
			add(0, tread(low, -1), down[2], 38, false);
			add(1, along(1), down[3], 30, false);
			// Square up to face the camera: the last foot comes alongside.
			const other = walkTo(along, back(at), DOWN.walk, 'square');
			add(other, along(0, sideOf(other)), [DOWN.walk[1] - 0.04, DOWN.face[1]], 14, false);
		}
		this.steps = steps;
	}

	private feetAt(t: number) {
		const feet = [
			{ ...this.start[0], lift: 0, roll: 0 },
			{ ...this.start[1], lift: 0, roll: 0 },
		];
		// Where each foot would be at an even pace: a swinging foot eases off and lands, but the body over them
		// keeps going, or he lurches forward and stops at every step.
		const pace = feet.map((f) => ({ x: f.x, y: f.y }));
		let bob = 0;
		let swing = 0;
		for (const st of this.steps) {
			if (t <= st.t0) continue;
			const f = feet[st.foot];
			if (t >= st.t1) {
				Object.assign(f, st.to, { lift: 0, roll: 0 });
				pace[st.foot] = { x: st.to.x, y: st.to.y };
				if (st.side) swing = st.foot === 1 ? 1 : -1;
				continue;
			}
			const u = (t - st.t0) / (st.t1 - st.t0);
			if (st.side) {
				pace[st.foot] = { x: mix(f.x, st.to.x, u), y: mix(f.y, st.to.y, u) };
				// The heel comes up while the front foot takes his weight; toe-off, the foot swings through with the
				// knee folding early, the heel strikes with the toes up, and the foot slaps flat.
				const s = seg(u, HEEL_OFF, 1);
				const e = easeInOut(s);
				// A short step (the first, from standing) barely lifts the foot: it is ahead of him by mid-swing.
				const travel = Math.abs(st.to.x - f.x) / (this.U * f.k);
				f.x = mix(f.x, st.to.x, e);
				f.y = mix(f.y, st.to.y, e);
				f.k = mix(f.k, st.to.k, e);
				f.lift = Math.sin(Math.PI * seg(s, 0, 0.88) ** 0.7) * st.lift * clamp(travel / (2 * STRIDE), 0.45, 1);
				f.roll =
					u < HEEL_OFF ? 22 * (u / HEEL_OFF) : s < 0.25 ? 22 : s < 0.8 ? mix(22, -14, (s - 0.25) / 0.55) : s < 0.88 ? -14 : mix(-14, 0, (s - 0.88) / 0.12);
				// The hips dip as the feet part (hung.ts); the arms reach the end of their swing as the heel lands.
				swing = (st.foot === 1 ? 1 : -1) * (2 * easeInOut(u) - 1);
			} else {
				const e = easeInOut(u);
				pace[st.foot] = { x: mix(f.x, st.to.x, e), y: mix(f.y, st.to.y, e) };
				f.x = mix(f.x, st.to.x, e);
				f.y = mix(f.y, st.to.y, e);
				f.k = mix(f.k, st.to.k, e);
				f.lift = Math.sin(Math.PI * u) * st.lift;
				bob = -Math.sin(Math.PI * u) * 5;
			}
		}
		return { feet, bob, swing, mid: (pace[0].x + pace[1].x) / 2, ground: (pace[0].y + pace[1].y) / 2 };
	}

	// Puts the figure over its feet and writes the feet into his own units.
	private stand(p: Pose, t: number) {
		const { feet, bob, swing, mid: x, ground } = this.feetAt(t);
		const k = (feet[0].k + feet[1].k) / 2;
		const side = p.body === 'side';
		const lo = Math.max(feet[0].y, feet[1].y);
		const hi = Math.min(feet[0].y, feet[1].y);
		const y = side ? ground : mix(lo, hi, 0.35);
		const s = this.U * k;
		const dir = side && p.flip ? -1 : 1;
		p.bob = bob;
		feet.forEach((f, i) => {
			const dy = (f.y - y) / s;
			p.feet[i] = {
				x: ((f.x - x) / s) * dir,
				y: dy - 18 - (side ? f.lift : 0),
				roll: side ? f.roll : 0,
				lift: side ? 0 : f.lift,
				// A foot up the screen from him is on ground further off, not on a step.
				reach: side ? 1 + ((1 - SLOPE) * dy) / LEG : 1,
			};
		});
		// Arms swing against the legs, the near arm forward with the far leg, each hand rising as it comes forward.
		if (side) {
			const arm = (x0: number, y0: number, reach: number, a: number) => ({ x: x0 + a * reach, y: y0 - Math.abs(a) * (a > 0 ? 14 : 4) });
			p.hands = [arm(4, -164, 30, swing), arm(8, -166, 38, -swing)];
			p.lean = 0.35;
		}
		return { x, y, k };
	}

	private rigPose(t: number, up: boolean) {
		const p = this.actor.pose;
		const face = this.actor.face;
		face.update(0);
		if (this.place === 'moon') return this.roomPose(p, t, up);
		p.wrist = [0, 0];
		p.open = [false, false];
		p.over = [false, false];
		p.tilt = 0;
		p.lean = 0;
		p.mouth = 'smile';
		p.blink = face.blink;
		p.lookX = face.lookX;
		p.lookY = face.lookY;
		if (up) {
			// Turning to walk over: the head goes first, the body a frame later; then his back for the stairs.
			p.head = t < 0.03 ? 'front' : t < UP.face[0] + 0.03 ? 'side' : 'back';
			p.body = t < 0.08 ? 'front' : t < UP.face[0] + 0.06 ? 'side' : 'back';
			p.flip = false;
			p.duck = easeInOut(seg(t, UP.climb[0] + 0.36, UP.enter[0] + 0.12));
		} else {
			const [t0, t1] = DOWN.turn;
			const [f0, f1] = DOWN.face;
			p.head = t < t0 + 0.02 || t > f0 + 0.03 ? 'front' : 'side';
			p.body = t < t0 + 0.05 || t > f0 + 0.06 ? 'front' : 'side';
			p.flip = true;
			p.duck = 1 - easeInOut(seg(t, OUT, OUT + 0.32));
			if (t > t1 && t < f1) p.lean = 0.35;
		}
		if (p.body !== 'side') {
			p.hands = [
				{ x: -62, y: -164 },
				{ x: 62, y: -164 },
			];
		}
		// A small dip before each turn, the anticipation that makes a turn read.
		const dip = up ? pulse(t, 0, UP.turn[1]) + pulse(t, UP.face[0] - 0.04, UP.face[1]) : pulse(t, ...(DOWN.turn as [number, number])) + pulse(t, ...(DOWN.face as [number, number]));
		const at = this.stand(p, t);
		p.bob += dip * 6;
		if (p.body === 'side' && (up ? t < UP.walk[0] || t > UP.walk[1] : t < DOWN.walk[0] || t > DOWN.walk[1])) {
			p.feet = rest('side').feet;
			p.hands = rest('side').hands;
		}
		return at;
	}

	// Walking between his spot and the airlock in his room: side on, head first, squaring up at the end.
	private roomPose(p: Pose, t: number, up: boolean) {
		const face = this.actor.face;
		const [w0, w1] = up ? MOON_OUT.walk : MOON_IN.walk;
		p.wrist = [0, 0];
		p.open = [false, false];
		p.over = [false, false];
		p.tilt = 0;
		p.duck = 0;
		p.mouth = 'smile';
		p.blink = face.blink;
		p.lookX = face.lookX;
		p.lookY = face.lookY;
		p.flip = this.airlock.x < this.F.x + this.spot ? up : !up;
		const turning = up ? t < w0 - 0.04 : t > w1 + 0.02;
		p.head = turning ? 'front' : 'side';
		p.body = up ? (t < w0 ? 'front' : 'side') : t > w1 + 0.05 ? 'front' : 'side';
		p.lean = p.body === 'side' ? 0.35 : 0;
		if (p.body !== 'side') {
			p.hands = [
				{ x: -62, y: -164 },
				{ x: 62, y: -164 },
			];
		}
		const at = this.stand(p, t);
		if (p.body === 'side' && (t < w0 || t > w1)) {
			p.feet = rest('side').feet;
			p.hands = rest('side').hands;
		}
		return at;
	}

	private strollPose(dt: number) {
		const st = this.stroll!;
		st.t += dt;
		const p = this.actor.pose;
		const face = this.actor.face;
		face.update(dt);
		const t = st.t;
		// Head first, then the body; and square up to the camera at the end.
		p.head = t < 0.04 || t > st.end - 0.1 ? 'front' : 'side';
		p.body = t < 0.08 || t > st.end - 0.06 ? 'front' : 'side';
		p.flip = st.flip;
		p.wrist = [0, 0];
		p.open = [false, false];
		p.over = [false, false];
		p.tilt = 0;
		p.lean = 0;
		p.duck = 0;
		p.mouth = face.mouth;
		p.blink = face.blink;
		p.lookX = face.lookX;
		p.lookY = face.lookY;
		if (p.body !== 'side') {
			p.hands = [
				{ x: -62, y: -164 },
				{ x: 62, y: -164 },
			];
		}
		const at = this.stand(p, Math.min(t, st.end));
		if (p.body === 'side' && t < 0.12) {
			p.feet = rest('side').feet;
			p.hands = rest('side').hands;
		}
		this.dom.apply(p);
		if (t >= st.end) {
			this.spot = st.to;
			this.stroll = null;
			this.idleDt = 1;
			st.done?.();
		}
		return at;
	}

	private corner(): RocketPose {
		const { w, h, U } = this;
		const narrow = w < 768;
		const angle = narrow ? 30 : 36;
		const scale = narrow ? 0.78 : 0.92;
		const port = narrow ? { x: w * 0.2, y: h * 0.84 } : { x: w * 0.12, y: h * 0.79 };
		const a = (angle * Math.PI) / 180;
		const L = -ROCKET.port.y * U * scale;
		return { x: port.x - L * Math.sin(a), y: port.y + L * Math.cos(a), angle, scale };
	}

	// Points over the cruising rocket's visible hull, on screen, to test whether a planet or label is behind it.
	veilPoints() {
		const c = this.corner();
		const a = (c.angle * Math.PI) / 180;
		const s = this.U * c.scale;
		const cos = Math.cos(a);
		const sin = Math.sin(a);
		return VEIL.map(([x, y]) => ({ x: c.x + (x * cos - y * sin) * s, y: c.y + (x * sin + y * cos) * s }));
	}

	// Where the nose of the cruising rocket is on screen, so the way home can sit beside it.
	noseInSpace() {
		const c = this.corner();
		const a = (c.angle * Math.PI) / 180;
		const L = 568 * this.U * c.scale;
		return { x: c.x + L * Math.sin(a), y: c.y - L * Math.cos(a) };
	}

	private hover(): RocketPose {
		return { x: this.R.x, y: this.h * (this.w < 768 ? 0.66 : 0.72), angle: 0, scale: 1 };
	}

	private rocketAt(t: number): RocketPose {
		const R = this.R;
		const base = { x: R.x, y: R.y, angle: 0, scale: 1 };
		const blend = (a: RocketPose, b: RocketPose, e: number) => ({
			x: mix(a.x, b.x, e),
			y: mix(a.y, b.y, e),
			angle: mix(a.angle, b.angle, e),
			scale: mix(a.scale, b.scale, e),
		});
		if (this.phase === 'ground') return base;
		if (this.phase === 'space') return this.corner();
		if (this.place === 'moon') {
			// To and from the moon the rocket flies sideways across the screen while the camera pans with it.
			const { w, h } = this;
			const over = { x: R.x, y: h * 0.6, angle: 0, scale: 1 };
			if (this.phase === 'down') {
				const cruise = { x: w * 0.3, y: h * 0.42, angle: 84, scale: 1 };
				let p = blend(this.corner(), cruise, easeInOut(seg(t, 0, 0.5)));
				p = blend(p, over, easeInOut(seg(t, 0.8, 1.25)));
				const hop = Math.sin(Math.PI * seg(t, DOWN.touch, DOWN.touch + 0.5)) * 16 * this.U;
				return { ...p, y: mix(p.y, R.y, easeOut(seg(t, 1.1, DOWN.touch))) - hop };
			}
			const back = { x: w * 0.62, y: h * 0.42, angle: -84, scale: 1 };
			let p = { ...base, y: mix(R.y, over.y, easeIn(seg(t, UP.lift[0], UP.lift[0] + 0.7) ** 0.8)) };
			p = blend(p, back, easeInOut(seg(t, UP.lift[0] + 0.5, UP.lift[0] + 1)));
			return blend(p, this.corner(), easeInOut(seg(t, UP.arrive[0] + 0.1, UP.arrive[1])));
		}
		if (this.phase === 'up') {
			const lift = easeIn(seg(t, UP.lift[0], UP.lift[1]) ** 0.8);
			const rising = { ...base, y: mix(R.y, this.hover().y, lift) };
			return blend(rising, this.corner(), easeInOut(seg(t, UP.arrive[0], UP.arrive[1])));
		}
		const stood = blend(this.corner(), this.hover(), easeInOut(seg(t, DOWN.stand[0], DOWN.stand[1])));
		return { ...stood, y: mix(stood.y, R.y, easeOut(seg(t, DOWN.descend[0], DOWN.descend[1]))) };
	}

	// How far the camera has pushed into the base, how much of his room shows, and how far the tube is out.
	private baseView(t: number) {
		if (this.place !== 'moon' || this.phase === 'space') return { zoom: 1, room: 0, tube: 0 };
		if (this.phase === 'ground') return { zoom: ZOOM, room: 1, tube: 1 };
		if (this.phase === 'down') {
			return {
				zoom: mix(1, ZOOM, easeIn(seg(t, MOON_IN.zoom[0], MOON_IN.zoom[1]))),
				room: easeOut(seg(t, MOON_IN.room[0], MOON_IN.room[1])),
				tube: easeInOut(seg(t, MOON_IN.tube[0], MOON_IN.tube[1])),
			};
		}
		return {
			zoom: mix(ZOOM, 1, easeOut(seg(t, MOON_OUT.zoom[0], MOON_OUT.zoom[1]))),
			room: 1 - easeIn(seg(t, MOON_OUT.room[0], MOON_OUT.room[1])),
			tube: 1 - easeInOut(seg(t, MOON_OUT.tube[0], MOON_OUT.tube[1])),
		};
	}

	// Cartoon squash and stretch: it squats before it leaps, stretches as it accelerates, squashes on landing.
	private stretch(t: number) {
		if (this.calm) return 0;
		if (this.phase === 'up') return -0.05 * pulse(t, UP.squat[0], UP.squat[1] + 0.06) + 0.07 * pulse(t, UP.squat[1], UP.lift[0] + 0.7);
		if (this.phase === 'down') {
			const land = seg(t, DOWN.touch, DOWN.touch + 0.45);
			return -0.07 * Math.sin(Math.PI * Math.min(1, land * 2.2)) * (1 - land) + 0.03 * pulse(t, DOWN.descend[0] + 0.3, DOWN.touch - 0.05);
		}
		return 0;
	}

	private camAt(t: number) {
		if (this.phase === 'ground') return 0;
		if (this.phase === 'space') return this.P;
		if (this.phase === 'up') return this.P * easeInOut(seg(t, UP.cam[0], UP.cam[1]));
		return this.P * (1 - easeInOut(seg(t, DOWN.cam[0], DOWN.cam[1])));
	}

	private throttle(t: number) {
		if (this.phase === 'ground') return 0;
		if (this.phase === 'space') return 0.72;
		if (this.phase === 'up') {
			const lit = easeOut(seg(t, UP.ignite[0], UP.ignite[1])) * 0.42;
			const climb = seg(t, UP.lift[0], UP.lift[0] + 0.5) * 0.58;
			const cruise = seg(t, UP.arrive[0], UP.arrive[1]) * -0.28;
			return lit + climb + cruise;
		}
		const flare = 0.72 + seg(t, 0, DOWN.stand[1]) * 0.36;
		const ease = seg(t, DOWN.blast[0], DOWN.touch) * -0.5;
		return Math.max(0, (flare + ease) * (1 - seg(t, DOWN.cutoff[0], DOWN.cutoff[1])));
	}

	private shakeAmp(t: number) {
		if (this.phase === 'up') return seg(t, UP.ignite[0], UP.ignite[1]) * (2.6 - 2 * seg(t, UP.lift[0], UP.lift[1]));
		if (this.phase === 'down') return pulse(t, DOWN.touch - 0.12, DOWN.touch + 0.18) * 2.2;
		return 0;
	}

	private smokeRate(t: number) {
		if (this.phase === 'up') return t > UP.ignite[0] + 0.1 && t < UP.lift[0] + 0.6 ? 24 : 0;
		if (this.phase === 'down') return t > DOWN.blast[0] && t < DOWN.blast[1] ? 26 : 0;
		return 0;
	}

	private spawn(now: number, n: number) {
		const { R, U } = this;
		for (let i = 0; i < n; i++) {
			const puff = this.puffs.find((p) => !p.alive) ?? this.puffs.reduce((a, b) => (a.born < b.born ? a : b));
			const side = Math.random() < 0.5 ? -1 : 1;
			Object.assign(puff, {
				alive: true,
				born: now,
				life: 1.7 + Math.random() * 1.2,
				x: R.x + side * Math.random() * 34 * U,
				y: R.y - (4 + Math.random() * 14) * U,
				vx: side * (170 + Math.random() * 330) * U,
				vy: -(10 + Math.random() * 50) * U,
				r0: (16 + Math.random() * 10) * U,
				r1: (56 + Math.random() * 56) * U,
			});
		}
	}

	private drawSmoke(now: number, dt: number) {
		const drag = Math.exp(-2.4 * dt);
		const rise = Math.exp(-1.1 * dt);
		for (const p of this.puffs) {
			if (!p.alive) continue;
			const u = (now - p.born) / 1000 / p.life;
			if (u >= 1) {
				p.alive = false;
				p.el.style.opacity = '0';
				continue;
			}
			p.vx *= drag;
			p.vy *= rise;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			const r = mix(p.r0, p.r1, easeOut(Math.min(1, u * 1.5)));
			p.el.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${r.toFixed(2)})`);
			p.el.style.opacity = String(u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4);
		}
	}

	private set(key: string, el: Styled, prop: 'transform' | 'opacity' | 'shown' | 'clip' | 'lit' | 'attr', value: string) {
		if (this.last[key] === value) return;
		this.last[key] = value;
		if (prop === 'transform') el.style.transform = value;
		else if (prop === 'opacity') el.style.opacity = value;
		else if (prop === 'shown') el.style.visibility = value;
		else if (prop === 'clip') el.style.clipPath = value;
		else if (prop === 'lit') el.style.setProperty('--lit', value);
		else el.setAttribute('transform', value);
	}

	// `pointer` is the pointer in px, or null when there is none to follow.
	update(dt: number, now: number, pointer: { x: number; y: number } | null) {
		this.clock += dt;
		if (this.busy) this.t += dt * this.speed;
		if (this.phase === 'up' && this.t >= UP.end) this.phase = 'space';
		else if (this.phase === 'down' && this.t >= this.downEnd) {
			this.phase = 'ground';
			this.onHome?.(this.place);
		}
		const t = this.t;
		const phase = this.phase;
		const { U } = this;

		const cam = this.camAt(t);
		this.progress = phase === 'space' ? 1 : phase === 'up' ? clamp(t / UP.end) : phase === 'down' ? 1 - clamp(t / this.downEnd) : 0;
		// The planets grow in the first time he gets there; the pen pass re-inks them on every arrival.
		if (phase === 'up' && t > UP.cam[0] + 0.5 && this.arriveAt < 0) this.arriveAt = this.clock;
		if (phase === 'down' || phase === 'ground') this.arriveAt = -1;
		if (this.arriveAt >= 0 && this.introAt < 0) this.introAt = this.arriveAt;
		this.intro = this.calm ? 1 : this.introAt < 0 ? 0 : clamp((this.clock - this.introAt) / 1.2);
		this.inkAge = this.arriveAt < 0 ? -1 : this.clock - this.arriveAt;

		// Camera shake moves the whole world together, resampled at 30 Hz so it reads as rumble.
		const amp = this.calm ? 0 : this.shakeAmp(t);
		if (now - this.shakeAt > 33) {
			this.shakeAt = now;
			this.shake = { x: (Math.random() * 2 - 1) * amp, y: (Math.random() * 2 - 1) * amp };
		}
		const { x: sx, y: sy } = this.shake;
		// The meadow is below space, the moon off to the right of it; only the ground in play moves.
		const onMoon = this.place === 'moon';
		const lift = cam / this.P;
		const meadowY = onMoon ? this.P : cam;
		const moonX = onMoon ? lift * this.Q : this.Q;
		const ground = onMoon ? { x: moonX, y: 0 } : { x: 0, y: meadowY };
		this.sysX = onMoon ? -(1 - lift) * this.Q : 0;
		this.sysY = onMoon ? 0 : cam - this.P;
		const world = `translate3d(${sx.toFixed(1)}px, ${(meadowY + sy).toFixed(1)}px, 0)`;
		this.els.ground.forEach((el, i) => {
			this.set(`g${i}`, el, 'transform', world);
			this.set(`gv${i}`, el, 'opacity', meadowY > this.h * 1.05 ? '0' : '1');
		});
		// The clouds are nearer the rocket's path than the meadow is, so they rush past faster.
		const sky = `translate3d(${sx.toFixed(1)}px, ${(meadowY * 1.35 + sy).toFixed(1)}px, 0)`;
		this.els.sky.forEach((el, i) => {
			this.set(`s${i}`, el, 'transform', sky);
			this.set(`sv${i}`, el, 'opacity', meadowY > this.h * 0.8 ? '0' : '1');
		});
		// Into the base: the camera pushes in through the dome's window and his room opens out of it.
		const view = this.baseView(t);
		const W = { x: this.dome.x, y: this.dome.y - 110 * U };
		const push = view.zoom === 1 ? '' : `translate(${W.x.toFixed(1)}px, ${W.y.toFixed(1)}px) scale(${view.zoom.toFixed(3)}) translate(${(-W.x).toFixed(1)}px, ${(-W.y).toFixed(1)}px) `;
		const outside = view.room < 1;
		this.set('moon', this.els.moon, 'transform', `${push}translate3d(${(moonX + sx).toFixed(1)}px, ${sy.toFixed(1)}px, 0)`);
		this.set('moonOn', this.els.moon, 'shown', moonX < this.w * 1.02 && outside ? 'visible' : 'hidden');
		this.set('tube', this.outpost.tube as unknown as Styled, 'attr', `translate(190 0) scale(${Math.max(0.001, view.tube).toFixed(3)} 1) translate(-190 0)`);
		const grow = mix(0.3, 1, view.room);
		this.set('base', this.els.base, 'transform', `translate(${W.x.toFixed(1)}px, ${W.y.toFixed(1)}px) scale(${grow.toFixed(3)}) translate(${(-W.x).toFixed(1)}px, ${(-W.y).toFixed(1)}px)`);
		this.set('baseFade', this.els.base, 'opacity', view.room.toFixed(3));
		this.set('baseOn', this.els.base, 'shown', view.room > 0 ? 'visible' : 'hidden');
		this.set('smoke', this.els.smoke as unknown as Styled, 'transform', `${push}translate3d(${(ground.x + sx).toFixed(1)}px, ${(ground.y + sy).toFixed(1)}px, 0)`);
		if (this.last.dust !== String(onMoon)) {
			this.last.dust = String(onMoon);
			this.els.smoke.classList.toggle('is-dust', onMoon);
		}
		this.set('pad', this.els.pad, 'transform', `translate3d(${(this.R.x - 200 * U + sx).toFixed(1)}px, ${(this.R.y - 20 * U + meadowY + sy).toFixed(1)}px, 0)`);

		this.drawRocket(t, now, amp, ground, sx, sy, view.zoom, W, outside);
		this.drawCabin(t, dt, pointer);
		if (!this.calm) {
			this.spawnDebt += this.smokeRate(t) * dt;
			const n = Math.floor(this.spawnDebt);
			this.spawnDebt -= n;
			if (n > 0) this.spawn(now, n);
			this.drawSmoke(now, dt);
		}
		this.drawFigure(t, dt, ground, sx, sy, pointer);
	}

	private drawRocket(
		t: number,
		now: number,
		amp: number,
		ground: { x: number; y: number },
		sx: number,
		sy: number,
		zoom: number,
		W: { x: number; y: number },
		outside: boolean,
	) {
		const { U } = this;
		const rp = this.rocketAt(t);
		const cruise = this.phase === 'space' && !this.calm;
		const bobY = cruise ? Math.sin(this.clock * 2.1) * 3 : 0;
		const bobA = cruise ? Math.sin(this.clock * 1.3) * 0.8 : 0;
		// On the pad it rides the camera with the meadow; in the air its pose is already in screen space.
		const onPad = this.phase === 'ground' || (this.phase === 'up' && t < UP.lift[0]) || (this.phase === 'down' && t > DOWN.touch);
		const jitter = amp > 0 ? (Math.random() - 0.5) * amp * 0.6 : 0;
		// Its foot on screen, pushed in with the camera when it goes into the base.
		const bx = W.x + (rp.x + (onPad ? ground.x : 0) + sx + jitter - W.x) * zoom;
		const by = W.y + (rp.y + (onPad ? ground.y : 0) + sy + bobY - W.y) * zoom;
		const x = bx - 200 * U;
		const y = by - 600 * U;
		const st = this.stretch(t);
		const k = rp.scale * zoom;
		// Pushed in past it, it is off the screen; and while the camera moves in or out its rough ink edge is
		// left off, since filtering it that big costs whole frames.
		this.set('rocketOn', this.els.rocket, 'shown', outside && bx - 200 * U * k < this.w ? 'visible' : 'hidden');
		const zoomed = zoom > 1.02;
		if (this.last.zoomed !== String(zoomed)) {
			this.last.zoomed = String(zoomed);
			this.els.rocket.classList.toggle('is-zoomed', zoomed);
		}
		this.set(
			'rocket',
			this.els.rocket,
			'transform',
			`translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${(rp.angle + bobA).toFixed(2)}deg) scale(${(k * (1 - st * 0.6)).toFixed(3)}, ${(k * (1 + st)).toFixed(3)})`,
		);
		const flying = !onPad && this.phase !== 'ground';
		if (this.last.flying !== String(flying)) {
			this.last.flying = String(flying);
			this.els.rocket.classList.toggle('is-flying', flying);
		}

		const thr = this.throttle(t);
		if (now - this.flickAt > 70) {
			this.flickAt = now;
			this.flick = (this.flick + 1 + Math.floor(Math.random() * 2)) % this.flames.length;
			this.flames.forEach((f, i) => (f.style.display = i === this.flick ? '' : 'none'));
			this.flickScale = 0.9 + Math.random() * 0.2;
		}
		const n = ROCKET.nozzle;
		this.set('flame', this.parts.flame, 'opacity', thr > 0.01 ? '1' : '0');
		this.set(
			'flameShape',
			this.parts['flame-shape'],
			'attr',
			`translate(0 ${n}) scale(${(0.7 + 0.3 * Math.min(1, thr)).toFixed(2)} ${(thr * this.flickScale).toFixed(2)}) translate(0 ${-n})`,
		);
	}

	private drawCabin(t: number, dt: number, pointer: { x: number; y: number } | null) {
		let door = 0;
		let stairs = 1;
		let face = 0;
		let thumb = 0;
		if (this.phase === 'up') {
			door = easeInOut(seg(t, UP.doorOpen[0], UP.doorOpen[1])) * (1 - easeInOut(seg(t, UP.doorShut[0], UP.doorShut[1])));
			stairs = 1 - easeInOut(seg(t, UP.stairs[0], UP.stairs[1]));
			face = easeOut(seg(t, UP.port[0], UP.port[1]));
			thumb = easeOut(seg(t, UP.thumb[0], UP.thumb[1])) * (1 - easeInOut(seg(t, UP.thumbDown[0], UP.thumbDown[1])));
		} else if (this.phase === 'space') {
			stairs = 0;
			face = 1;
		} else if (this.phase === 'down') {
			stairs = easeInOut(seg(t, DOWN.stairs[0], DOWN.stairs[1]));
			door = easeInOut(seg(t, DOWN.door[0], DOWN.door[1])) * (1 - easeInOut(seg(t, DOWN.doorShut[0], DOWN.doorShut[1])));
			face = 1 - seg(t, DOWN.portOff[0], DOWN.portOff[1]);
		}
		// Docked to the base there are no stairs to put down: he goes through the tube.
		if (this.place === 'moon') {
			door = 0;
			stairs = 0;
			if (this.phase === 'down') face = 1 - seg(t, MOON_IN.portOff[0], MOON_IN.portOff[1]);
			if (this.phase === 'ground') face = 0;
		}
		const { port, door: D } = ROCKET;
		this.set('door', this.parts['door-panel'], 'attr', `translate(${(-(D.x1 - D.x0 + 4) * door).toFixed(1)} 0)`);
		this.set('stairs', this.parts.stairs, 'attr', `translate(0 ${D.sill}) scale(1 ${Math.max(0.001, stairs).toFixed(3)}) translate(0 ${-D.sill})`);
		this.set('stairsOn', this.parts.stairs, 'opacity', stairs > 0.02 ? '1' : '0');
		this.set('face', this.parts['port-face'], 'opacity', face.toFixed(2));
		this.set('faceY', this.parts['port-face'], 'attr', `translate(0 ${(port.face + (1 - face) * 44).toFixed(1)}) scale(${port.scale})`);
		this.set('thumb', this.parts['port-thumb'], 'opacity', thumb.toFixed(2));
		this.set(
			'thumbS',
			this.parts['port-thumb'],
			'attr',
			`translate(${port.thumb.x} ${(port.thumb.y + (1 - thumb) * 28).toFixed(1)}) rotate(${((1 - thumb) * -24).toFixed(1)})`,
		);
		if (face > 0) {
			// From the porthole he looks at the pointer, or out at the middle of the system.
			const p = this.portScreen(this.rocketAt(t));
			if (pointer) this.port.look((pointer.x - p.x) / 500, (pointer.y - p.y) / 400);
			else this.port.look(0.6, -0.5);
			this.port.update(dt, thumb > 0.5 ? 'grin' : 'smile');
			this.portFace.apply(this.port.lookX, this.port.lookY, this.port.blink, this.port.mouth);
		}
	}

	private portScreen(rp: RocketPose) {
		const a = (rp.angle * Math.PI) / 180;
		const L = -ROCKET.port.y * this.U * rp.scale;
		return { x: rp.x + L * Math.sin(a), y: rp.y - L * Math.cos(a) };
	}

	private drawFigure(
		t: number,
		dt: number,
		ground: { x: number; y: number },
		sx: number,
		sy: number,
		pointer: { x: number; y: number } | null,
	) {
		const { U } = this;
		const el = this.els.hung;
		let at = { x: this.F.x + this.spot, y: this.F.y, k: 1 };
		let show = true;
		let lit = 1;
		let clip = 'none';
		let fade = 1;
		if (this.phase === 'ground' && this.stroll) {
			at = this.strollPose(dt);
		} else if (this.phase === 'ground') {
			if (pointer) this.actor.lookAt((pointer.x - this.headAt.x) / 520, (pointer.y - this.headAt.y) / 420);
			// Standing about he is drawn at 30 fps: plenty for breath and blinks, and half the repaints.
			this.idleDt += dt;
			if (this.idleDt >= 1 / 31) {
				this.dom.apply(this.actor.update(this.idleDt));
				this.idleDt = 0;
			}
		} else if (this.place === 'moon' && (this.phase === 'up' || this.phase === 'down')) {
			// In the room he walks out of (or in from) the airlock, fading where its doorway swallows him.
			const up = this.phase === 'up';
			show = up ? t < MOON_OUT.gone : t >= MOON_IN.room[1];
			if (show) {
				at = this.rigPose(t, up);
				this.dom.apply(this.actor.pose);
				fade = up ? 1 - seg(t, MOON_OUT.gone - 0.18, MOON_OUT.gone) : seg(t, MOON_IN.walk[0], MOON_IN.walk[0] + 0.18);
			}
		} else if (this.phase === 'up') {
			show = t < UP.enter[1];
			if (show) {
				at = this.rigPose(t, true);
				this.dom.apply(this.actor.pose);
				lit = 1 - 0.55 * seg(t, UP.enter[0] + 0.04, UP.enter[1]);
				if (t > UP.enter[0]) clip = this.doorClip(at);
			}
		} else if (this.phase === 'down') {
			show = t >= OUT;
			if (show) {
				at = this.rigPose(t, false);
				this.dom.apply(this.actor.pose);
				lit = 0.45 + 0.55 * seg(t, OUT, OUT + 0.3);
				if (t < OUT + 0.24) clip = this.doorClip(at);
			}
		} else {
			show = false;
		}
		if (show !== this.shown) {
			this.shown = show;
			el.style.visibility = show ? '' : 'hidden';
		}
		if (!show) return;
		const s = U * at.k;
		this.set(
			'hung',
			el,
			'transform',
			`translate3d(${(at.x - 150 * s + ground.x + sx).toFixed(1)}px, ${(at.y - 500 * s + ground.y + sy).toFixed(1)}px, 0) scale(${at.k.toFixed(3)})`,
		);
		this.set('lit', el, 'lit', lit.toFixed(2));
		this.set('clip', el, 'clip', clip);
		this.set('fade', el, 'opacity', fade.toFixed(2));
		this.headAt = { x: at.x + ground.x, y: at.y - 486 * s + ground.y, s };
	}

	// Top of his head on screen, for the speech bubble.
	head() {
		return this.headAt;
	}

	// The door opening in the figure element's own px, so only what is inside the doorway shows.
	private doorClip(at: { x: number; y: number; k: number }) {
		const { U, R } = this;
		const D = ROCKET.door;
		const s = U * at.k;
		const left = at.x - 150 * s;
		const top = at.y - 500 * s;
		const k = at.k;
		const L = (R.x + D.x0 * U - left) / k;
		const Rr = (R.x + D.x1 * U - left) / k;
		const T = (R.y + D.top * U - top) / k;
		const B = (R.y + D.sill * U - top) / k;
		const r = (D.r * U) / k;
		return `inset(${T.toFixed(1)}px ${(300 * U - Rr).toFixed(1)}px ${(520 * U - B).toFixed(1)}px ${L.toFixed(1)}px round ${r.toFixed(1)}px ${r.toFixed(1)}px 0 0)`;
	}
}
