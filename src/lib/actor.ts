// What he does while nobody is steering him: breathes, blinks on his own schedule, follows the pointer
// with his eyes, waves with the wrist trailing the forearm, and talks in mouth shapes, not a flapping scale.
import { rest, type Mouth, type Point, type Pose } from './hung';

const TAU = Math.PI * 2;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const arc = (a: Point, c: Point, b: Point, t: number) => ({
	x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
	y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});
const approach = (v: number, goal: number, rate: number, dt: number) => v + (goal - v) * (1 - Math.exp(-rate * dt));

const TALK: Mouth[] = ['open', 'o', 'flat', 'open', 'smile', 'o', 'open'];

// Blinks at uneven intervals, now and then twice, and looks where it is told to.
export class Face {
	blink = 0;
	lookX = 0;
	lookY = 0;
	mouth: Mouth = 'smile';
	private t = 0;
	private next = 1.6;
	private at = -1;
	private twice = false;
	private goalX = 0;
	private goalY = 0;
	private talkUntil = 0;
	private mouthAt = 0;
	private k = 0;

	look(x: number, y: number) {
		this.goalX = clamp(x, -1, 1);
		this.goalY = clamp(y, -1, 1);
	}

	talk(seconds: number) {
		this.talkUntil = this.t + seconds;
	}

	get talking() {
		return this.t < this.talkUntil;
	}

	// Shut the eyes now (used to hide a head turn, the way animators do).
	blinkNow() {
		if (this.at < 0) this.at = this.t;
	}

	update(dt: number, rest: Mouth = 'smile') {
		this.t += dt;
		if (this.at < 0 && this.t > this.next) {
			this.at = this.t;
			this.twice = Math.random() < 0.18;
		}
		if (this.at >= 0) {
			const b = this.t - this.at;
			this.blink = b < 0.05 ? b / 0.05 : b < 0.1 ? 1 : b < 0.18 ? 1 - (b - 0.1) / 0.08 : 0;
			if (b >= 0.18) {
				this.at = this.twice ? this.t + 0.08 : -1;
				this.twice = false;
				this.next = this.t + 2.2 + Math.random() * 3.6;
			}
		}
		this.lookX = approach(this.lookX, this.goalX, 9, dt);
		this.lookY = approach(this.lookY, this.goalY, 9, dt);
		if (this.talking) {
			if (this.t > this.mouthAt) {
				this.k = (this.k + 1 + Math.floor(Math.random() * 2)) % TALK.length;
				this.mouth = TALK[this.k];
				this.mouthAt = this.t + 0.075 + Math.random() * 0.06;
			}
		} else {
			this.mouth = rest;
		}
	}
}

const REST_R = { x: 62, y: -164 };
// Thumb hooked under the backpack strap, up by the chest, elbow down at his side.
const STRAP = { x: -33, y: -286 };
const WAVE_UP = { x: 102, y: -398 };
// The hand travels out and round on its way up, the way a shoulder actually lifts an arm.
const WAVE_ARC = { x: 146, y: -270 };

// The standing figure on the meadow, front on.
export class Actor {
	pose: Pose = rest('front');
	face = new Face();
	strap = true;
	private t = 0;
	private wave = -1;
	private waves = 3;
	private glance = -1;
	private nextGlance = 9 + Math.random() * 5;
	private pointerAt = -10;
	private tilt = 0;

	constructor(private calm = false) {}

	lookAt(dx: number, dy: number) {
		this.face.look(dx, dy);
		this.pointerAt = this.t;
	}

	greet(times = 3) {
		if (this.calm) return;
		this.waves = times;
		this.wave = 0;
	}

	get waving() {
		return this.wave >= 0;
	}

	update(dt: number): Pose {
		this.t += dt;
		const p = this.pose;
		const t = this.t;
		const face = this.face;
		p.body = 'front';
		p.duck = 0;
		p.flip = false;
		p.feet[0] = { x: -25, y: -18, roll: 0, lift: 0 };
		p.feet[1] = { x: 23, y: -18, roll: 0, lift: 0 };

		// Breath and a slow shift of weight between the feet.
		p.bob = this.calm ? 0 : 1.5 * Math.sin((t * TAU) / 3.8);
		let lean = this.calm ? 0 : 0.14 * Math.sin((t * TAU) / 7.4);
		let tilt = face.lookX * 3;

		// The left hand rests on the backpack strap; the right hangs loose and swings a touch with the breath.
		p.hands[0] = this.strap ? { ...STRAP } : { x: -62, y: -164 };
		p.hands[1] = { x: REST_R.x, y: REST_R.y + p.bob * 0.5 };
		p.wrist = [this.strap ? -10 : 0, 0];
		p.open = [false, false];
		p.over = [this.strap, false];
		let mouth: Mouth = 'smile';

		if (this.wave >= 0) {
			const w = (this.wave += dt);
			const cycle = 0.38;
			const raise = 0.24;
			const hold = raise + cycle * this.waves;
			const down = hold + 0.32;
			let up: number;
			if (w < raise) up = easeOut(w / raise);
			else if (w < hold) up = 1;
			else up = 1 - easeInOut(clamp((w - hold) / (down - hold)));
			const swing = w > raise * 0.6 && w < hold + 0.08 ? Math.sin(((w - raise * 0.6) / cycle) * TAU) : 0;
			const hand = arc(REST_R, WAVE_ARC, WAVE_UP, up);
			hand.x += swing * 16 * up;
			hand.y += Math.abs(swing) * 4 * up;
			p.hands[1] = hand;
			// The hand trails the forearm by a fraction of a beat, which is what makes a wave read as loose.
			p.wrist[1] = up * 20 * Math.sin(((w - raise * 0.6) / cycle) * TAU - 1.1);
			p.open[1] = up > 0.45;
			lean -= 0.35 * up;
			tilt += 4 * up;
			mouth = 'grin';
			if (w >= down) this.wave = -1;
		}

		// Now and then, when the pointer has been still, he looks off to his left (at the rocket on the home
		// page), hiding the turn of his head in a blink.
		if (!this.calm && this.wave < 0 && !face.talking && t > this.nextGlance && t - this.pointerAt > 2.5) {
			this.glance = 0;
			this.nextGlance = t + 10 + Math.random() * 6;
			face.blinkNow();
		}
		p.head = 'front';
		if (this.glance >= 0) {
			this.glance += dt;
			if (this.glance > 0.05 && this.glance < 1.15) p.head = 'side';
			if (this.glance > 1.1 && this.glance < 1.13) face.blinkNow();
			if (this.glance > 1.3) this.glance = -1;
		}
		if (face.talking) tilt += 1.6 * Math.sin(t * TAU * 2.6);

		face.update(dt, mouth);
		this.tilt = approach(this.tilt, tilt, 10, dt);
		p.lean = lean;
		p.tilt = this.tilt;
		p.lookX = face.lookX;
		p.lookY = face.lookY;
		p.blink = face.blink;
		p.mouth = face.mouth;
		return p;
	}
}
