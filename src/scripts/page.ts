import { Actor } from '../lib/actor';
import { bake } from '../lib/bake';
import { DoodleCursor } from '../lib/cursor';
import { HungDom } from '../lib/hung';
import { Flyers } from '../lib/flyers';
import { bindInkLinks } from '../lib/ink';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.querySelector<HTMLElement>('[data-flyers]') ?? document.body;

bindInkLinks({ color: '#f2a541' });

const cursorEl = document.querySelector<HTMLElement>('.cursor');
const cursor = cursorEl ? new DoodleCursor(cursorEl) : null;
const flyers = new Flyers(root);

// Info: he waves as the bubble pops, then breathes, blinks and follows the pointer; hover him for another wave.
const wave = document.querySelector<SVGSVGElement>('[data-wave]');
const actor = wave ? new Actor(reduced) : null;
const pose = wave ? new HungDom(wave.querySelector<SVGGElement>('[data-hung]')!) : null;
if (wave && actor) {
	window.setTimeout(() => actor.greet(3), 650);
	let again = 0;
	wave.parentElement!.addEventListener('pointerenter', () => {
		if (performance.now() < again || actor.waving) return;
		again = performance.now() + 4000;
		actor.greet(2);
	});
	addEventListener('pointermove', (e) => {
		const r = wave.getBoundingClientRect();
		actor.lookAt((e.clientX - (r.left + r.width / 2)) / 520, (e.clientY - (r.top + r.height * 0.12)) / 420);
	});
}

const size = () => {
	flyers.resize(root.clientWidth, root.clientHeight);
};
size();
addEventListener('resize', size);
// The meadow boils from canvases in Safari (see src/lib/bake.ts).
bake();

let last = performance.now();
const loop = (now: number) => {
	const dt = Math.min(0.05, (now - last) / 1000);
	last = now;
	if (!reduced) {
		flyers.update(now / 1000);
	}
	if (actor && pose) pose.apply(actor.update(dt));
	cursor?.tick(now);
	requestAnimationFrame(loop);
};
requestAnimationFrame(loop);

document.documentElement.classList.add('is-ready');
