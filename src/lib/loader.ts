import { drain } from './ink';

// The loading sheet (components/Loader.astro) counts while the page comes in, the last of it the page's own setup,
// which says so here. Once the sheet is full its rocket flies off, the sheet drains away as ink and the page is
// shown (`.is-ready`); what waits for that (his hello) waits on `onShown`. Until then the wheel and the keys are
// held, so a scroll under the sheet doesn't set off a trip. Without the sheet (a later load in the visit) the page
// is shown as soon as it is set up.

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sheet = document.querySelector<HTMLElement>('[data-loader]');
// The rocket's flight off the sheet, before the ink drains.
const EXIT_MS = reduced ? 150 : 450;
const HELD = ['wheel', 'keydown'] as const;
const waiting: (() => void)[] = [];
let shown = false;

const hold = (e: Event) => e.stopImmediatePropagation();
if (sheet) for (const type of HELD) addEventListener(type, hold, { capture: true });

function show() {
	if (shown) return;
	shown = true;
	for (const type of HELD) removeEventListener(type, hold, { capture: true });
	root.classList.add('is-ready');
	waiting.splice(0).forEach((fn) => fn());
}

const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));

/** The page is set up; the sheet also waits for `work` (Safari's bake), then a frame drawn. */
export function ready(work?: Promise<unknown>) {
	if (!sheet) return show();
	void Promise.resolve(work)
		.catch(() => {})
		.then(frame)
		.then(() => {
			root.classList.add('is-started');
			const lift = () => {
				// Already shown, should the scripts have come too late (the layout's head script).
				if (root.classList.contains('is-ready')) {
					sheet.remove();
					return show();
				}
				window.setTimeout(() => {
					drain(getComputedStyle(sheet).backgroundColor);
					sheet.remove();
					try {
						sessionStorage.setItem('loaded', '1');
					} catch {}
					show();
				}, EXIT_MS);
			};
			if (root.classList.contains('is-loaded')) lift();
			else addEventListener('loader:full', lift, { once: true });
		});
}

/** Calls `fn` once the page is shown (at once, if it is). */
export function onShown(fn: () => void) {
	if (shown) fn();
	else waiting.push(fn);
}
