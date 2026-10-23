// The owner as a cartoon of ink parts on joints. Arms and legs are worked out from where the hands and feet
// should be (two-bone IK), so elbows and knees bend instead of whole limbs swinging like pendulums.
// Units: 480 is his height; the origin is the ground between his feet, y grows downwards.

export type View = 'front' | 'side' | 'back';
export type Mouth = 'smile' | 'flat' | 'o' | 'open' | 'grin';

export interface Point {
	x: number;
	y: number;
}

export interface Foot extends Point {
	// Toe angle in degrees (side view only) and how far the foot is off the ground (front and back).
	roll: number;
	lift: number;
}

export interface Pose {
	body: View;
	head: View;
	// Side view facing left instead of right.
	flip: boolean;
	// Upper body drop (breathing, the dip of a step) and how far he ducks under the hatch.
	bob: number;
	duck: number;
	lean: number;
	tilt: number;
	lookX: number;
	lookY: number;
	blink: number;
	mouth: Mouth;
	hands: [Point, Point];
	// Extra turn of each hand at the wrist, in degrees (the flap of a wave), and whether it is open.
	wrist: [number, number];
	open: [boolean, boolean];
	// The hand is in front of his body (front view), so the arm is drawn over the shirt.
	over: [boolean, boolean];
	feet: [Foot, Foot];
}

export const COLORS = {
	ink: '#17130f',
	skin: '#f7d2b0',
	hair: '#1f1a16',
	shine: '#57504a',
	tee: '#2e2823',
	pants: '#353b47',
	pack: '#5fb3a3',
	packDark: '#4b9a8b',
	shoe: '#fbf7ef',
	blush: '#ef8f6f',
	lip: '#a94f42',
};

const LIMB = { upper: 70, fore: 64, thigh: 80, shin: 76 };
const ANKLE = -18;

const front = {
	shoulders: [
		{ x: -56, y: -300 },
		{ x: 56, y: -300 },
	] as [Point, Point],
	hips: [
		{ x: -20, y: -172 },
		{ x: 20, y: -172 },
	] as [Point, Point],
	neck: { x: 0, y: -336 },
};

// Joints of each body view, before the bob and duck are applied.
const RIG: Record<View, { shoulders: [Point, Point]; hips: [Point, Point]; neck: Point }> = {
	front,
	back: front,
	side: {
		shoulders: [
			{ x: 0, y: -300 },
			{ x: 6, y: -300 },
		],
		hips: [
			{ x: -2, y: -172 },
			{ x: 2, y: -172 },
		],
		neck: { x: 10, y: -336 },
	},
};

export function rest(view: View = 'front'): Pose {
	const side = view === 'side';
	return {
		body: view,
		head: view,
		flip: false,
		bob: 0,
		duck: 0,
		lean: 0,
		tilt: 0,
		lookX: 0,
		lookY: 0,
		blink: 0,
		mouth: 'smile',
		wrist: [0, 0],
		open: [false, false],
		over: [false, false],
		hands: side
			? [
					{ x: -6, y: -160 },
					{ x: 12, y: -162 },
				]
			: [
					{ x: -64, y: -162 },
					{ x: 64, y: -162 },
				],
		feet: side
			? [
					{ x: -4, y: ANKLE, roll: 0, lift: 0 },
					{ x: 6, y: ANKLE, roll: 0, lift: 0 },
				]
			: [
					{ x: -24, y: ANKLE, roll: 0, lift: 0 },
					{ x: 24, y: ANKLE, roll: 0, lift: 0 },
				],
	};
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

// Elbow or knee for a limb from `s` reaching for `t`; `bend` +1 or -1 picks the side the joint folds to.
function ik(s: Point, t: Point, a: number, b: number, bend: number) {
	return reach(s, t, a, b, (j1, j2) => (bend > 0 ? j1 : j2));
}

// Both ways a two-bone limb can fold; `pick` chooses between them.
function reach(s: Point, t: Point, a: number, b: number, pick: (j1: Point, j2: Point) => Point) {
	let dx = t.x - s.x;
	let dy = t.y - s.y;
	let d = Math.hypot(dx, dy) || 0.001;
	const max = a + b - 0.5;
	const min = Math.abs(a - b) + 1;
	if (d > max || d < min) {
		const k = clamp(d, min, max) / d;
		dx *= k;
		dy *= k;
		d = clamp(d, min, max);
	}
	const cos = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
	const base = Math.atan2(dy, dx);
	const at = (ang: number) => ({ x: s.x + a * Math.cos(ang), y: s.y + a * Math.sin(ang) });
	const off = Math.acos(cos);
	return { j: pick(at(base - off), at(base + off)), end: { x: s.x + dx, y: s.y + dy } };
}

// Elbows sit away from the body and below the hand: out to the side from the front, behind him from the side.
function elbow(s: Point, t: Point, out: number) {
	return reach(s, t, LIMB.upper, LIMB.fore, (j1, j2) => (out * j1.x + 0.5 * j1.y >= out * j2.x + 0.5 * j2.y ? j1 : j2));
}

const lerp = (a: Point, b: Point, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const deg = (a: Point, b: Point) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
const quad = (a: Point, j: Point, b: Point, t: number) => ({
	x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * j.x + t * t * b.x,
	y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * j.y + t * t * b.y,
});

type Cap = 'round' | 'flat';

// A limb as a filled outline round its centre line: thick at the root, thin at the end, the joint
// rounded off so it reads as an elbow or a knee rather than a hinge. `w` is the width at root, joint, end.
function taper(s: Point, j: Point, e: Point, w: [number, number, number], start: Cap = 'round', end: Cap = 'round') {
	const soft = 0.28;
	const a = lerp(j, s, soft);
	const b = lerp(j, e, soft);
	const pts: Point[] = [];
	for (let k = 0; k < 4; k++) pts.push(lerp(s, a, k / 4));
	for (let k = 0; k < 6; k++) pts.push(quad(a, j, b, k / 6));
	for (let k = 0; k <= 4; k++) pts.push(lerp(b, e, k / 4));
	const run = [0];
	for (let k = 1; k < pts.length; k++) run.push(run[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
	const total = run[run.length - 1] || 1;
	const tj = Math.hypot(j.x - s.x, j.y - s.y) / (Math.hypot(j.x - s.x, j.y - s.y) + Math.hypot(e.x - j.x, e.y - j.y) || 1);
	const left: Point[] = [];
	const right: Point[] = [];
	pts.forEach((q, k) => {
		const u = run[k] / total;
		const width = u < tj ? w[0] + ((w[1] - w[0]) * u) / tj : w[1] + ((w[2] - w[1]) * (u - tj)) / (1 - tj || 1);
		const p0 = pts[Math.max(0, k - 1)];
		const p1 = pts[Math.min(pts.length - 1, k + 1)];
		const len = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
		const nx = -(p1.y - p0.y) / len;
		const ny = (p1.x - p0.x) / len;
		left.push({ x: q.x + nx * width * 0.5, y: q.y + ny * width * 0.5 });
		right.push({ x: q.x - nx * width * 0.5, y: q.y - ny * width * 0.5 });
	});
	const at = (q: Point) => `${r1(q.x)} ${r1(q.y)}`;
	const r0 = w[0] / 2;
	const r2 = w[2] / 2;
	let d = `M${at(left[0])}`;
	for (let k = 1; k < left.length; k++) d += `L${at(left[k])}`;
	d += end === 'round' ? `A${r1(r2)} ${r1(r2)} 0 0 0 ${at(right[right.length - 1])}` : `L${at(right[right.length - 1])}`;
	for (let k = right.length - 2; k >= 0; k--) d += `L${at(right[k])}`;
	d += start === 'round' ? `A${r1(r0)} ${r1(r0)} 0 0 0 ${at(left[0])}Z` : 'Z';
	return d;
}

interface Solved {
	arms: { d: string; sleeve: string; fore: string; hand: string }[];
	legs: { d: string; shoe: string }[];
	upper: string;
	flip: string;
	hips: string;
	head: string;
}

// Everything the drawing needs for one pose: limb paths and the transforms of the rigid parts.
// A front or back sleeve carrying on from the shirt's shoulder seam: the top edge runs from the corner of
// the shoulder along the top of the arm to a straight hem, the underside back into the armpit. The shirt is
// drawn over its inner end, so the arm reads as coming out of the shirt, raised or hanging.
function sleeve(i: number, s: Point, j: Point, chest: Point) {
	const side = i === 0 ? -1 : 1;
	const len = Math.hypot(j.x - s.x, j.y - s.y) || 1;
	const d = { x: (j.x - s.x) / len, y: (j.y - s.y) / len };
	// The top of the arm: outwards when it hangs, upwards when it is raised.
	const top = i === 0 ? { x: -d.y, y: d.x } : { x: d.y, y: -d.x };
	const hem = lerp(s, j, 0.46);
	const half = 18;
	const corner = { x: side * 60 + chest.x, y: -312 + chest.y };
	const pit = { x: side * 48 + chest.x, y: -270 + chest.y };
	const out = { x: hem.x + top.x * half, y: hem.y + top.y * half };
	const inn = { x: hem.x - top.x * half, y: hem.y - top.y * half };
	const bow = { x: (corner.x + out.x) / 2 + top.x * 3, y: (corner.y + out.y) / 2 + top.y * 3 };
	const at = (q: Point) => `${r1(q.x)} ${r1(q.y)}`;
	return `M${at(corner)}Q${at(bow)} ${at(out)}L${at(inn)}L${at(pit)}Z`;
}

export function solve(p: Pose): Solved {
	const rig = RIG[p.body];
	const side = p.body === 'side';
	// The hips ride the bob, and in a long side-on stride they sink until both feet are within a leg's reach,
	// the dip a real step has; the chest also folds forward when he ducks and sways with the lean.
	let bob = p.bob;
	if (side) {
		const reach = LIMB.thigh + LIMB.shin - 3;
		rig.hips.forEach((h, i) => {
			const dx = p.feet[i].x - (h.x + p.lean * 2);
			if (Math.abs(dx) < reach) bob = Math.max(bob, p.feet[i].y - Math.sqrt(reach * reach - dx * dx) - h.y);
		});
	}
	const hip = { x: p.lean * 2, y: bob };
	const chest = { x: p.lean * 7, y: bob + p.duck * 70 };

	const arms = rig.shoulders.map((s0, i) => {
		const s = { x: s0.x + chest.x, y: s0.y + chest.y };
		const t = p.hands[i];
		const { j, end } = elbow(s, t, side ? -1 : i === 0 ? -1 : 1);
		// A short sleeve with a straight hem over the top of the upper arm.
		const hem = lerp(s, j, 0.46);
		const a = deg(j, end) - 90 + p.wrist[i];
		return {
			d: taper(s, j, end, [23, 19, 16]),
			sleeve: side ? taper(s, lerp(s, hem, 0.5), hem, [38, 36, 34], 'round', 'flat') : sleeve(i, s, j, chest),
			// The forearm on its own, drawn over the sleeve when the hand comes in front of him.
			fore: taper(j, lerp(j, end, 0.5), end, [19, 17.5, 16]),
			hand: `translate(${r1(end.x)} ${r1(end.y)}) rotate(${r1(a)})`,
		};
	});

	const legs = rig.hips.map((h0, i) => {
		const h = { x: h0.x + hip.x, y: h0.y + hip.y };
		const f = p.feet[i];
		const ankle = { x: f.x, y: f.y - (side ? 0 : f.lift) };
		let knee: Point;
		let end = ankle;
		if (side) {
			({ j: knee, end } = ik(h, ankle, LIMB.thigh, LIMB.shin, 1));
		} else {
			// Seen from the front a knee comes towards you: the leg shortens and the knee kicks out a little.
			knee = lerp(h, ankle, 0.52);
			knee.x += (i === 0 ? -1 : 1) * f.lift * 0.08;
		}
		// The leg starts under the hem, above the hip joint, so its top never shows.
		const k = Math.hypot(knee.x - h.x, knee.y - h.y) || 1;
		const top = { x: h.x - ((knee.x - h.x) / k) * 22, y: h.y - ((knee.y - h.y) / k) * 22 };
		const d = taper(top, knee, end, side ? [46, 34, 28] : [42, 34, 30], 'flat');
		const grow = side ? 1 : 1 + f.lift * 0.0016;
		return {
			d,
			// The shoe hangs off the end of the leg, so it never parts from the trouser cuff.
			shoe: `translate(${r1(end.x)} ${r1(end.y)}) rotate(${r1(side ? f.roll : 0)}) scale(${r1(grow * 100) / 100})`,
		};
	});

	const neck = { x: rig.neck.x + chest.x + p.lean * 3, y: rig.neck.y + chest.y + p.duck * 22 };
	return {
		arms,
		legs,
		upper: `translate(${r1(chest.x)} ${r1(chest.y)})`,
		flip: p.body === 'side' && p.flip ? 'scale(-1 1)' : '',
		hips: `translate(${r1(hip.x)} ${r1(hip.y)})`,
		head: `${p.body === 'side' && p.flip ? 'scale(-1 1) ' : ''}translate(${r1(neck.x)} ${r1(neck.y)}) rotate(${r1(p.tilt + p.lean * 4)})`,
	};
}

// Eyes and mouth of a front-facing face (on the body, or looking out of the porthole): pupils move inside
// the whites, a blink squeezes each eye shut onto its lid line.
export class FaceDom {
	private eyes: { el: SVGGElement; pupil: SVGElement; lid: SVGElement; cy: number }[];
	private mouths: Map<string, SVGElement>;
	private mouth = '';
	private eyeKey = '';

	constructor(root: ParentNode) {
		this.eyes = [...root.querySelectorAll<SVGGElement>('[data-eye]')].map((el) => ({
			el,
			pupil: el.querySelector<SVGElement>('[data-pupil]')!,
			lid: el.parentElement!.querySelector<SVGElement>(`[data-lid="${el.dataset.eye}"]`)!,
			cy: Number(el.dataset.cy),
		}));
		this.mouths = new Map([...root.querySelectorAll<SVGElement>('[data-mouth]')].map((m) => [m.dataset.mouth!, m]));
	}

	apply(lookX: number, lookY: number, blink: number, mouth: Mouth) {
		const open = r1(Math.max(0.06, 1 - blink));
		const key = `${r1(lookX * 4.2)} ${r1(lookY * 3.6)} ${open}`;
		if (key !== this.eyeKey) {
			this.eyeKey = key;
			for (const e of this.eyes) {
				e.pupil.setAttribute('transform', `translate(${r1(lookX * 4.2)} ${r1(lookY * 3.6)})`);
				e.el.setAttribute('transform', `translate(0 ${e.cy}) scale(1 ${open}) translate(0 ${-e.cy})`);
				e.lid.style.display = open < 0.4 ? '' : 'none';
			}
		}
		if (mouth !== this.mouth) {
			this.mouth = mouth;
			for (const [k, el] of this.mouths) el.style.display = k === mouth ? '' : 'none';
		}
	}
}

// The parts a pose writes to, looked up once.
export class HungDom {
	private views: Record<View, SVGGElement>;
	private heads: Record<View, SVGGElement>;
	private arms: Record<
		View,
		{
			d: SVGPathElement[];
			sleeve: SVGPathElement[];
			fore: SVGPathElement[];
			hands: SVGGElement[];
			shut: SVGElement[];
			open: SVGElement[];
			front: SVGElement | null;
		}[]
	>;
	private flips: SVGGElement | null;
	private openKey = '';
	private legs: Record<View, { d: SVGPathElement[]; shoe: SVGGElement }[]>;
	private uppers: Record<View, SVGGElement[]>;
	private hips: Record<View, SVGGElement[]>;
	private head: SVGGElement;
	private face: FaceDom;
	private body: View | '' = '';
	private headView: View | '' = '';
	private written = new WeakMap<Element, string>();

	// Writes an attribute only when its value changed; most frames move a few parts, not all of them.
	private put(el: Element, name: string, value: string) {
		if (this.written.get(el) === value) return;
		this.written.set(el, value);
		el.setAttribute(name, value);
	}

	constructor(readonly root: SVGGElement) {
		const q = <T extends Element>(sel: string, el: ParentNode = root) => el.querySelector<T>(sel)!;
		const views = ['front', 'side', 'back'] as View[];
		this.views = {} as Record<View, SVGGElement>;
		this.heads = {} as Record<View, SVGGElement>;
		this.arms = {} as typeof this.arms;
		this.legs = {} as typeof this.legs;
		this.uppers = {} as Record<View, SVGGElement[]>;
		this.hips = {} as Record<View, SVGGElement[]>;
		for (const v of views) {
			const g = q<SVGGElement>(`[data-body="${v}"]`);
			this.views[v] = g;
			this.heads[v] = q<SVGGElement>(`[data-head="${v}"]`);
			this.uppers[v] = [...g.querySelectorAll<SVGGElement>('[data-upper]')];
			this.hips[v] = [...g.querySelectorAll<SVGGElement>('[data-hips]')];
			this.arms[v] = [0, 1].map((i) => ({
				d: [...g.querySelectorAll<SVGPathElement>(`[data-arm="${i}"]`)],
				sleeve: [...g.querySelectorAll<SVGPathElement>(`[data-sleeve="${i}"]`)],
				fore: [...g.querySelectorAll<SVGPathElement>(`[data-fore="${i}"]`)],
				hands: [...g.querySelectorAll<SVGGElement>(`[data-hand="${i}"]`)],
				shut: [...g.querySelectorAll<SVGElement>(`[data-hand="${i}"] [data-shut]`)],
				open: [...g.querySelectorAll<SVGElement>(`[data-hand="${i}"] [data-open]`)],
				front: g.querySelector<SVGElement>(`[data-slot="${i}-front"]`),
			}));
			this.legs[v] = [0, 1].map((i) => ({
				d: [...g.querySelectorAll<SVGPathElement>(`[data-leg="${i}"]`)],
				shoe: q<SVGGElement>(`[data-shoe="${i}"]`, g),
			}));
		}
		this.head = q<SVGGElement>('[data-part="head"]');
		this.flips = root.querySelector<SVGGElement>('[data-flip]');
		this.face = new FaceDom(this.heads.front);
	}

	apply(p: Pose) {
		if (p.body !== this.body) {
			this.body = p.body;
			for (const v of Object.keys(this.views) as View[]) this.views[v].style.display = v === p.body ? '' : 'none';
		}
		if (p.head !== this.headView) {
			this.headView = p.head;
			for (const v of Object.keys(this.heads) as View[]) this.heads[v].style.display = v === p.head ? '' : 'none';
		}
		const s = solve(p);
		if (this.flips) this.put(this.flips, 'transform', s.flip);
		const openKey = `${p.body}${p.open}${p.over}`;
		const arms = this.arms[p.body];
		if (openKey !== this.openKey) {
			this.openKey = openKey;
			arms.forEach((a, i) => {
				for (const el of a.shut) el.style.display = p.open[i] ? 'none' : '';
				for (const el of a.open) el.style.display = p.open[i] ? '' : 'none';
				if (a.front) a.front.style.display = p.over[i] ? '' : 'none';
			});
		}
		s.arms.forEach((a, i) => {
			for (const el of arms[i].d) this.put(el, 'd', a.d);
			for (const el of arms[i].sleeve) this.put(el, 'd', a.sleeve);
			for (const el of arms[i].fore) this.put(el, 'd', a.fore);
			for (const el of arms[i].hands) this.put(el, 'transform', a.hand);
		});
		const legs = this.legs[p.body];
		s.legs.forEach((l, i) => {
			for (const el of legs[i].d) this.put(el, 'd', l.d);
			this.put(legs[i].shoe, 'transform', l.shoe);
		});
		for (const el of this.uppers[p.body]) this.put(el, 'transform', s.upper);
		for (const el of this.hips[p.body]) this.put(el, 'transform', s.hips);
		this.put(this.head, 'transform', s.head);
		if (p.head === 'front') this.face.apply(p.lookX, p.lookY, p.blink, p.mouth);
	}
}
