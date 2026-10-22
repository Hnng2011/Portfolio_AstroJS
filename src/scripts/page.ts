import { DoodleCursor } from '../lib/cursor';
import { Birds } from '../lib/birds';
import { Flyers } from '../lib/flyers';
import { bindInkLinks } from '../lib/ink';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.querySelector<HTMLElement>('[data-flyers]') ?? document.body;

bindInkLinks({ color: '#f2a541' });

const cursorEl = document.querySelector<HTMLElement>('.cursor');
const cursor = cursorEl ? new DoodleCursor(cursorEl) : null;
const flyers = new Flyers(root);
const birds = new Birds(document);

const size = () => {
	flyers.resize(root.clientWidth, root.clientHeight);
	birds.resize(innerWidth, innerHeight);
};
size();
addEventListener('resize', size);

let last = performance.now();
const loop = (now: number) => {
	const dt = Math.min(0.05, (now - last) / 1000);
	last = now;
	if (!reduced) {
		flyers.update(now / 1000);
		birds.update(now / 1000, dt);
	}
	cursor?.tick(now);
	requestAnimationFrame(loop);
};
requestAnimationFrame(loop);

document.documentElement.classList.add('is-ready');
