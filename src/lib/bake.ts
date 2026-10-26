// The cheap boil (see Meadow.astro) is three inked copies of a drawing, each through a still frame of the ink,
// and only which copy shows changes. Chrome and Firefox keep each filtered copy as it is, but Safari (so every
// browser on an iPhone) runs the SVG filters again whenever a copy is shown or hidden: the meadow alone held the
// home page to a few frames a second there. So in Safari each copy marked `data-bake` is drawn through its filter
// once, into a canvas that takes its place and boils the same way.
//
// A copy is an <svg> at inset 0 of its parent, holding one <use href="#art" filter="url(#frame)">. `data-bake="2"`
// bakes it at twice the detail, for a drawing the camera pushes in on.

const NS = 'http://www.w3.org/2000/svg';
// Safari's engine, which every browser on an iPhone runs. Elsewhere the canvases would only cost memory.
const SAFARI = /AppleWebKit/.test(navigator.userAgent) && !/Chrome\/|Chromium\//.test(navigator.userAgent);
// Sharp enough for wobbly ink, and under half the memory of a 3x phone screen.
const MAX_SCALE = 2;
// Safari will not draw a canvas bigger than this.
const MAX_AREA = 16e6;

interface Baked {
	svg: SVGSVGElement;
	canvas: HTMLCanvasElement;
	w: number;
	h: number;
}

const ser = new XMLSerializer();
const baked: Baked[] = [];

// The viewBox mapping of an <svg> drawn w by h (preserveAspectRatio meet or slice).
function fit(svg: SVGSVGElement, w: number, h: number) {
	const vb = svg.viewBox.baseVal;
	const [align = 'xMidYMid', mode = 'meet'] = (svg.getAttribute('preserveAspectRatio') ?? '').split(/\s+/).filter(Boolean);
	const s = (mode === 'slice' ? Math.max : Math.min)(w / vb.width, h / vb.height);
	const ax = align.includes('xMin') ? 0 : align.includes('xMax') ? 1 : 0.5;
	const ay = align.includes('YMin') ? 0 : align.includes('YMax') ? 1 : 0.5;
	return { s, x: (w - vb.width * s) * ax - vb.x * s, y: (h - vb.height * s) * ay - vb.y * s };
}

// The art, its filter and whatever they point at (clip paths and the like), for a standalone SVG.
function defsFor(ids: string[]) {
	const seen = new Set<string>();
	const out: string[] = [];
	const visit = (id: string) => {
		if (seen.has(id)) return;
		seen.add(id);
		const el = document.getElementById(id);
		if (!el) return;
		out.push(ser.serializeToString(el));
		for (const node of [el, ...el.querySelectorAll('*')]) {
			for (const { value } of node.attributes) {
				for (const m of value.matchAll(/url\(["']?#([^"')]+)["']?\)/g)) visit(m[1]);
				if (value.startsWith('#') && /^#[\w-]+$/.test(value)) visit(value.slice(1));
			}
		}
	};
	ids.forEach(visit);
	return out.join('');
}

async function bakeOne(svg: SVGSVGElement) {
	const use = svg.querySelector('use');
	const w = svg.clientWidth;
	const h = svg.clientHeight;
	if (!use || !w || !h) return;
	const art = (use.getAttribute('href') ?? '').slice(1);
	const frame = /#([^)"']+)/.exec(use.getAttribute('filter') ?? '')?.[1] ?? '';
	const m = fit(svg, w, h);
	// The drawing with its filter's margin (5% round it) and its strokes, kept to its box and a little round it:
	// drawings run over their box (trees above the meadow, the moon's limb), and far past it is never seen.
	const bb = use.getBBox();
	const mx = bb.width * 0.05 + 6;
	const my = bb.height * 0.05 + 6;
	const px = Math.max(120, w * 0.25);
	const py = Math.max(120, h * 0.25);
	const x0 = Math.floor(Math.max((bb.x - mx) * m.s + m.x, -px));
	const y0 = Math.floor(Math.max((bb.y - my) * m.s + m.y, -py));
	const x1 = Math.ceil(Math.min((bb.x + bb.width + mx) * m.s + m.x, w + px));
	const y1 = Math.ceil(Math.min((bb.y + bb.height + my) * m.s + m.y, h + py));
	const rw = x1 - x0;
	const rh = y1 - y0;
	if (rw <= 0 || rh <= 0) return;
	let q = Math.min(devicePixelRatio || 1, MAX_SCALE) * (Number(svg.dataset.bake) || 1);
	q = Math.min(q, Math.sqrt(MAX_AREA / (rw * rh)));
	const cw = Math.round(rw * q);
	const ch = Math.round(rh * q);

	// The filter only over the canvas: run over the whole drawing (the moon is a circle 2700 across) it is past
	// what Safari will filter, and nothing is drawn at all.
	const ink = document.getElementById(frame)?.cloneNode(true) as SVGFilterElement | undefined;
	if (!ink) return;
	ink.setAttribute('filterUnits', 'userSpaceOnUse');
	ink.setAttribute('x', String((x0 - m.x) / m.s));
	ink.setAttribute('y', String((y0 - m.y) / m.s));
	ink.setAttribute('width', String(rw / m.s));
	ink.setAttribute('height', String(rh / m.s));
	const src =
		`<svg xmlns="${NS}" width="${cw}" height="${ch}" viewBox="${x0} ${y0} ${rw} ${rh}"><defs>${ser.serializeToString(ink)}${defsFor([art])}</defs>` +
		`<g transform="matrix(${m.s} 0 0 ${m.s} ${m.x} ${m.y})"><use href="#${art}" filter="url(#${frame})"/></g></svg>`;
	const img = new Image();
	img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`;
	await img.decode();

	const canvas = document.createElement('canvas');
	canvas.width = cw;
	canvas.height = ch;
	canvas.getContext('2d')!.drawImage(img, 0, 0, cw, ch);
	for (const { name, value } of svg.attributes) {
		if (name !== 'viewBox' && name !== 'preserveAspectRatio' && name !== 'data-bake') canvas.setAttribute(name, value);
	}
	canvas.setAttribute('aria-hidden', 'true');
	canvas.style.cssText += `;inset:auto;left:${x0}px;top:${y0}px;width:${rw}px;height:${rh}px`;
	// The svg may have been put back for a new size while this one drew.
	if (!svg.isConnected) return;
	svg.replaceWith(canvas);
	baked.push({ svg, canvas, w, h });
}

let queue = Promise.resolve();

/** Resolves once the copies queued so far are drawn (at once outside Safari). */
export const bakeDone = () => queue;

function run(svgs: SVGSVGElement[]) {
	// One at a time, so a phone gets frames in between.
	for (const svg of svgs) queue = queue.then(() => bakeOne(svg).catch(() => {}));
}

// Bakes every copy under root, then again whenever the copies change size.
export function bake(root: ParentNode = document) {
	if (!SAFARI) return;
	run([...root.querySelectorAll<SVGSVGElement>('svg[data-bake]')]);
	let wait = 0;
	addEventListener('resize', () => {
		clearTimeout(wait);
		wait = window.setTimeout(() => {
			const stale = baked.filter(({ canvas, w, h }) => {
				const box = canvas.parentElement;
				return box && (Math.abs(box.clientWidth - w) > 1 || Math.abs(box.clientHeight - h) > 1);
			});
			for (const b of stale) {
				b.canvas.replaceWith(b.svg);
				baked.splice(baked.indexOf(b), 1);
			}
			run(stale.map((b) => b.svg));
		}, 250);
	});
}
