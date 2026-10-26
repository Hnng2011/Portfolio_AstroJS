const ARROW = [
	[3, 3],
	[3, 25],
	[9, 19.5],
	[13.5, 29],
	[17.5, 27],
	[13, 18],
	[21, 18],
];

export class DoodleCursor {
	readonly enabled = matchMedia('(hover: hover) and (pointer: fine)').matches;
	private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
	private text: HTMLElement;
	private arrow: SVGPathElement;
	private x = -9999;
	private y = -9999;
	private boil = 0;
	magnet: HTMLElement | null = null;

	constructor(readonly el: HTMLElement) {
		this.text = el.querySelector<HTMLElement>('[data-cursor-label]')!;
		this.arrow = el.querySelector<SVGPathElement>('[data-cursor-arrow]')!;
		if (!this.enabled) return;
		document.documentElement.classList.add('has-cursor');
		// A page opened from a link picks the doodle up where the pointer was, so it shows before the mouse moves.
		try {
			const at = JSON.parse(sessionStorage.getItem('cursor') ?? 'null');
			if (at) {
				this.x = at.x;
				this.y = at.y;
				el.classList.add('is-on');
			}
		} catch {}
		addEventListener('pagehide', () => {
			try {
				if (el.classList.contains('is-on')) sessionStorage.setItem('cursor', JSON.stringify({ x: this.x, y: this.y }));
				else sessionStorage.removeItem('cursor');
			} catch {}
		});
		addEventListener('pointerdown', () => el.classList.add('is-down'));
		addEventListener('pointerup', () => el.classList.remove('is-down'));
		addEventListener('pointermove', (e) => {
			this.x = e.clientX;
			this.y = e.clientY;
			el.classList.add('is-on');
			const target = (e.target as HTMLElement).closest<HTMLElement>('.pill, .close');
			if (target) {
				const b = target.getBoundingClientRect();
				target.style.setProperty('--mx', `${e.clientX - b.left}px`);
				target.style.setProperty('--my', `${e.clientY - b.top}px`);
			}
			if (target !== this.magnet) {
				this.magnet = target;
				el.classList.toggle('is-morph', !!target);
				if (target) this.label('');
			}
		});
		document.addEventListener('pointerleave', () => el.classList.remove('is-on'));
	}

	label(text: string) {
		this.el.classList.toggle('is-label', !!text);
		if (text) this.text.textContent = text;
	}

	tick(now: number) {
		if (!this.enabled || this.x < -1000) return;
		this.el.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
		if (this.reduced || now - this.boil < 125) return;
		this.boil = now;
		const j = () => (Math.random() - 0.5) * 1.1;
		const pts = ARROW.map(([x, y], i) => (i === 0 ? [x, y] : [x + j(), y + j()]));
		let d = `M${pts[0][0]} ${pts[0][1]}`;
		for (let i = 1; i <= pts.length; i++) {
			const [x, y] = pts[i % pts.length];
			const [px, py] = pts[i - 1];
			d += ` Q${(px + x) / 2 + j()} ${(py + y) / 2 + j()} ${x} ${y}`;
		}
		this.arrow.setAttribute('d', d + 'Z');
	}

	run() {
		const loop = (now: number) => {
			this.tick(now);
			requestAnimationFrame(loop);
		};
		requestAnimationFrame(loop);
	}
}
