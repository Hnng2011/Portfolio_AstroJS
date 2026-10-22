interface Lobe {
	x: number;
	width: number;
	reach: number;
	lag: number;
}

interface Pour {
	start: number;
	duration: number;
	flood: boolean;
	lobes: Lobe[];
	phase: number;
}

export interface InkOptions {
	color: string;
	originX?: number;
	onCovered: () => void;
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function pour(start: number, duration: number, flood: boolean, originX: number): Pour {
	const lobes = Array.from({ length: flood ? 7 : 6 }, () => ({
		x: clamp01(originX + (Math.random() - 0.5) * (flood ? 1.4 : 1)),
		width: flood ? 0.03 + Math.random() * 0.05 : 0.035 + Math.random() * 0.05,
		reach: flood ? 0.08 + Math.random() * 0.1 : 0.05 + Math.random() * 0.12,
		lag: Math.random() * (flood ? 0.25 : 0.4),
	}));
	return { start, duration, flood, lobes, phase: Math.random() * Math.PI * 2 };
}

function edge(p: Pour, t: number, u: number, originX: number, now: number) {
	const body = p.flood
		? -0.25 + 1.55 * easeInOut(t)
		: (0.08 + 0.34 * Math.exp(-Math.pow((u - originX) / 0.3, 2))) * easeOut(t);
	const wave =
		(0.022 * Math.sin(u * 7.5 + p.phase + now * 0.9) + 0.012 * Math.sin(u * 17 - p.phase * 1.7 + now * 1.4)) *
		Math.min(1, t * 3);
	let lobes = 0;
	for (const l of p.lobes) {
		const grow = easeOut(clamp01((t - l.lag) / (1 - l.lag)));
		lobes += l.reach * grow * Math.exp(-Math.pow((u - l.x) / l.width, 2));
	}
	return body + wave + lobes;
}

export function pourInk({ color, originX = 0.4, onCovered }: InkOptions) {
	const canvas = document.createElement('canvas');
	canvas.setAttribute('aria-hidden', 'true');
	canvas.dataset.ink = '';
	Object.assign(canvas.style, {
		position: 'fixed',
		inset: '0',
		width: '100%',
		height: '100%',
		zIndex: '200',
		pointerEvents: 'auto',
	});
	document.body.append(canvas);

	const W = innerWidth;
	const H = innerHeight;
	const dpr = Math.min(devicePixelRatio || 1, 2);
	canvas.width = Math.round(W * dpr);
	canvas.height = Math.round(H * dpr);
	const ctx = canvas.getContext('2d')!;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.fillStyle = color;

	if (reduced()) {
		ctx.fillRect(0, 0, W, H);
		canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, fill: 'forwards' }).finished.then(onCovered);
		return;
	}

	const pours = [pour(0, 1.05, false, originX), pour(0.95, 1.05, true, 1 - originX)];
	const step = Math.max(3, W / 320);
	const t0 = performance.now();
	let done = false;

	const tick = (now: number) => {
		const s = (now - t0) / 1000;
		ctx.clearRect(0, 0, W, H);
		ctx.beginPath();
		let shallowest = -Infinity;
		for (const p of pours) {
			const t = clamp01((s - p.start) / p.duration);
			if (t <= 0) continue;
			ctx.moveTo(-2, -2);
			for (let x = 0; x <= W + step; x += step) {
				const y = edge(p, t, Math.min(x, W) / W, originX, s) * H;
				ctx.lineTo(x, y);
				if (p.flood) shallowest = shallowest === -Infinity ? y : Math.min(shallowest, y);
			}
			ctx.lineTo(W + 2, -2);
			ctx.closePath();
		}
		ctx.fill();

		if (shallowest > H + 2 || s > 2.4) {
			ctx.fillRect(0, 0, W, H);
			if (!done) {
				done = true;
				onCovered();
			}
			return;
		}
		requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
}

export function bindInkLinks(options: Omit<InkOptions, 'onCovered' | 'originX'>) {
	drainInk();
	document.addEventListener('click', (e) => {
		const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-ink]');
		if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		if (new URL(link.href).pathname === location.pathname) return;
		const r = link.getBoundingClientRect();
		pourInk({
			...options,
			originX: (r.left + r.width / 2) / innerWidth,
			onCovered: () => {
				try {
					sessionStorage.setItem('ink', options.color);
				} catch {}
				location.assign(link.href);
			},
		});
	});
	addEventListener('pageshow', (e) => {
		if (e.persisted) document.querySelectorAll('canvas[data-ink]').forEach((c) => c.remove());
	});
}

function drainInk() {
	const root = document.documentElement;
	let color = '';
	try {
		color = sessionStorage.getItem('ink') ?? '';
		sessionStorage.removeItem('ink');
	} catch {}
	if (!color) return;
	const canvas = document.createElement('canvas');
	canvas.setAttribute('aria-hidden', 'true');
	Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', zIndex: '300', pointerEvents: 'none' });
	document.body.append(canvas);
	root.classList.remove('ink-arrive');
	const W = innerWidth;
	const H = innerHeight;
	const dpr = Math.min(devicePixelRatio || 1, 2);
	canvas.width = Math.round(W * dpr);
	canvas.height = Math.round(H * dpr);
	const ctx = canvas.getContext('2d')!;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.fillStyle = color;
	if (reduced()) {
		canvas.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).finished.then(() => canvas.remove());
		ctx.fillRect(0, 0, W, H);
		return;
	}
	const p = pour(0, 0.9, true, 0.5);
	const step = Math.max(3, W / 320);
	const t0 = performance.now();
	const tick = (now: number) => {
		const t = clamp01((now - t0) / 1000 / 0.9);
		ctx.clearRect(0, 0, W, H);
		ctx.beginPath();
		ctx.moveTo(-2, H + 2);
		for (let x = 0; x <= W + step; x += step) {
			const u = Math.min(x, W) / W;
			let lobe = 0;
			for (const l of p.lobes) lobe += l.reach * Math.exp(-Math.pow((u - l.x) / l.width, 2));
			const wave = 0.025 * Math.sin(u * 7.5 + p.phase + t * 3) + 0.012 * Math.sin(u * 17 - t * 4);
			const y = (-0.25 + 1.6 * easeInOut(t) + wave - lobe * 0.7 * Math.min(1, t * 2)) * H;
			ctx.lineTo(x, y);
		}
		ctx.lineTo(W + 2, H + 2);
		ctx.closePath();
		ctx.fill();
		if (t < 1) requestAnimationFrame(tick);
		else canvas.remove();
	};
	ctx.fillRect(0, 0, W, H);
	requestAnimationFrame(tick);
}
