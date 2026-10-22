interface Bird {
	perch: SVGGElement;
	sky: SVGSVGElement;
	phase: 'perched' | 'crouch' | 'flying';
	start: number;
	duration: number;
	dir: number;
	sx: number;
	sy: number;
	size: number;
	lastX: number;
	landing: boolean;
}

// The flying bird is drawn in a 48x40 box (viewBox -24 -30 48 40) at the same scale as the perched one,
// whose drawing spans about 39 units from tail to beak with its feet at y = 3.
const SKY_W = 48;
const SKY_H = 40;
const PERCH_W = 39;
const FEET = (3 + 30) / SKY_H;

const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

// Perched birds now and then crouch, take off, fly a loop over the meadow, glide down and land where they started.
export class Birds {
	private birds: Bird[] = [];
	private next = 4;
	private w = 1;
	private h = 1;

	constructor(root: ParentNode) {
		const perches = [...root.querySelectorAll<SVGGElement>('[data-perch]')];
		const skies = [...root.querySelectorAll<SVGSVGElement>('[data-sky-bird]')];
		perches.forEach((perch, i) => {
			if (!skies[i]) return;
			this.birds.push({
				perch,
				sky: skies[i],
				phase: 'perched',
				start: 0,
				duration: 4,
				dir: 1,
				sx: 0,
				sy: 0,
				size: 40,
				lastX: 0,
				landing: false,
			});
		});
		for (const b of this.birds) {
			b.perch.addEventListener('animationend', (e) => {
				if (e.animationName.includes('bird-land')) b.perch.classList.remove('is-landed');
			});
		}
	}

	resize(w: number, h: number) {
		this.w = w;
		this.h = h;
	}

	update(t: number, dt: number) {
		this.next -= dt;
		if (this.next <= 0) {
			this.next = 6 + Math.random() * 7;
			const idle = this.birds.filter((b) => b.phase === 'perched');
			const bird = idle[Math.floor(Math.random() * idle.length)];
			if (bird) this.crouch(bird, t);
		}
		for (const b of this.birds) {
			if (b.phase === 'crouch' && t - b.start > 0.22) this.takeOff(b, t);
			if (b.phase === 'flying') this.fly(b, t);
		}
	}

	private crouch(b: Bird, t: number) {
		const r = b.perch.getBoundingClientRect();
		if (!r.width || r.top > this.h || r.bottom < 0) return;
		b.size = (r.width * SKY_W) / PERCH_W;
		b.sky.style.width = `${b.size}px`;
		b.sky.style.height = `${(b.size * SKY_H) / SKY_W}px`;
		b.sx = r.left + r.width / 2;
		b.sy = r.bottom;
		b.lastX = b.sx;
		b.dir = b.sx > this.w / 2 ? -1 : 1;
		b.phase = 'crouch';
		b.start = t;
		b.perch.classList.add('is-crouching');
	}

	private takeOff(b: Bird, t: number) {
		b.phase = 'flying';
		b.start = t;
		b.duration = 4.2 + Math.random() * 1.4;
		b.landing = false;
		b.perch.classList.remove('is-crouching');
		b.perch.classList.add('is-away');
		b.sky.classList.remove('is-landing');
		b.sky.style.visibility = 'visible';
		this.fly(b, t);
	}

	private fly(b: Bird, t: number) {
		const raw = (t - b.start) / b.duration;
		if (raw >= 1) {
			b.phase = 'perched';
			b.sky.style.visibility = 'hidden';
			b.sky.classList.remove('is-landing');
			b.perch.classList.remove('is-away');
			b.perch.classList.add('is-landed');
			return;
		}
		const p = easeInOut(raw);
		const A = Math.min(this.w * 0.42, 560);
		const H = Math.min(this.h * 0.32, 300);
		const x = b.sx + b.dir * A * (1 - Math.cos(2 * Math.PI * p)) * 0.5;
		const y = b.sy - H * Math.sin(Math.PI * p) - H * 0.35 * Math.sin(2 * Math.PI * p);
		const face = Math.abs(x - b.lastX) > 0.05 ? (x > b.lastX ? 1 : -1) : b.dir;
		b.lastX = x;
		if (!b.landing && raw > 0.84) {
			b.landing = true;
			b.sky.classList.add('is-landing');
		}
		const top = y - (FEET * b.size * SKY_H) / SKY_W;
		b.sky.style.transform = `translate3d(${(x - b.size / 2).toFixed(1)}px, ${top.toFixed(1)}px, 0) scaleX(${face})`;
	}
}
