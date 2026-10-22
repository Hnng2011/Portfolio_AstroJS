interface Flyer {
	el: HTMLElement;
	bw: number;
	dir: number;
	ax: number;
	ay: number;
	rx: number;
	ry: number;
	speed: number;
	phase: number;
	px: number;
}

const BUTTERFLIES = [
	[0.2, 0.5],
	[0.8, 0.42],
	[0.12, 0.3],
	[0.88, 0.62],
	[0.62, 0.22],
];
const BEES = [
	[0.32, 0.8],
	[0.68, 0.76],
	[0.86, 0.86],
];

export class Flyers {
	private flyers: Flyer[] = [];
	private w = 1;
	private h = 1;

	constructor(root: HTMLElement) {
		let b = 0;
		let f = 0;
		root.querySelectorAll<HTMLElement>('[data-critter]').forEach((el) => {
			const bee = el.dataset.critter === 'bee';
			const k = bee ? b++ : f++;
			const [ax, ay] = bee ? BEES[k % BEES.length] : BUTTERFLIES[k % BUTTERFLIES.length];
			this.flyers.push({
				el,
				bw: 36,
				dir: 1,
				ax,
				ay,
				rx: bee ? 0.06 : 0.09 + (k % 3) * 0.02,
				ry: bee ? 0.04 : 0.06 + (k % 2) * 0.03,
				speed: bee ? 0.9 + k * 0.25 : 0.24 + k * 0.05,
				phase: k * 2.1 + (bee ? 1 : 0),
				px: 0,
			});
		});
	}

	resize(w: number, h: number) {
		this.w = w;
		this.h = h;
		for (const f of this.flyers) f.bw = f.el.offsetWidth || 36;
	}

	update(t: number) {
		const { w, h } = this;
		for (const f of this.flyers) {
			const a = t * f.speed + f.phase;
			const x = w * (f.ax + f.rx * Math.sin(a) + f.rx * 0.35 * Math.sin(a * 2.3));
			const y = h * (f.ay + f.ry * Math.sin(a * 1.7) + 0.012 * Math.sin(a * 6));
			if (Math.abs(x - f.px) > 0.2) f.dir = x > f.px ? 1 : -1;
			f.px = x;
			f.el.style.transform = `translate3d(${(x - f.bw / 2).toFixed(1)}px, ${y.toFixed(1)}px, 0) scaleX(${f.dir})`;
		}
	}
}
