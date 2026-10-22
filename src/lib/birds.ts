interface Bird {
	perch: SVGGElement;
	sky: SVGSVGElement;
	start: number;
	duration: number;
	dir: number;
	sx: number;
	sy: number;
	size: number;
	flying: boolean;
	lastX: number;
}

// Perched birds take off now and then, fly a loop over the meadow, and land where they started.
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
			this.birds.push({ perch, sky: skies[i], start: 0, duration: 4, dir: 1, sx: 0, sy: 0, size: 40, flying: false, lastX: 0 });
		});
	}

	resize(w: number, h: number) {
		this.w = w;
		this.h = h;
	}

	update(t: number, dt: number) {
		this.next -= dt;
		if (this.next <= 0) {
			this.next = 6 + Math.random() * 7;
			const idle = this.birds.filter((b) => !b.flying);
			const bird = idle[Math.floor(Math.random() * idle.length)];
			if (bird) this.launch(bird, t);
		}
		for (const b of this.birds) {
			if (!b.flying) continue;
			const p = (t - b.start) / b.duration;
			if (p >= 1) {
				b.flying = false;
				b.sky.style.visibility = 'hidden';
				b.perch.classList.remove('is-away');
				continue;
			}
			const A = Math.min(this.w * 0.42, 560);
			const H = Math.min(this.h * 0.32, 300);
			const x = b.sx + b.dir * A * (1 - Math.cos(2 * Math.PI * p)) * 0.5;
			const y = b.sy - H * Math.sin(Math.PI * p) - H * 0.35 * Math.sin(2 * Math.PI * p);
			const face = x >= b.lastX ? 1 : -1;
			b.lastX = x;
			b.sky.style.transform = `translate3d(${(x - b.size / 2).toFixed(1)}px, ${(y - b.size * 0.75).toFixed(1)}px, 0) scaleX(${face})`;
		}
	}

	private launch(b: Bird, t: number) {
		const r = b.perch.getBoundingClientRect();
		if (!r.width || r.top > this.h || r.bottom < 0) return;
		b.size = Math.max(26, r.width * 1.5);
		b.sky.style.width = `${b.size}px`;
		b.sky.style.height = `${b.size * 0.85}px`;
		b.sx = r.left + r.width / 2;
		b.sy = r.bottom;
		b.lastX = b.sx;
		b.dir = b.sx > this.w / 2 ? -1 : 1;
		b.start = t;
		b.duration = 3.6 + Math.random() * 1.6;
		b.flying = true;
		b.perch.classList.add('is-away');
		b.sky.style.visibility = 'visible';
	}
}
