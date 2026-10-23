import { projects } from '../data/portfolio';
import { Flyers } from '../lib/flyers';
import { DoodleCursor } from '../lib/cursor';
import { bindInkLinks } from '../lib/ink';
import { Launch } from '../lib/launch';
import { Solar, type SolarView } from '../lib/solar';
import { Splat } from '../lib/splat';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const narrow = matchMedia('(max-width: 767px)');
const root = document.documentElement;

const n = projects.length;
const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
const wrap = (k: number) => ((k % n) + n) % n;

const stage = document.querySelector<HTMLElement>('[data-stage]')!;
const solarCanvas = stage.querySelector<HTMLCanvasElement>('[data-solar]')!;
const labels = Array.from(stage.querySelectorAll<HTMLElement>('[data-label]'));
const picks = Array.from(stage.querySelectorAll<HTMLButtonElement>('[data-pick]'));
const holo = stage.querySelector<HTMLElement>('[data-holo]')!;
const splatCanvas = stage.querySelector<HTMLCanvasElement>('[data-splat]')!;
const screens = Array.from(holo.querySelectorAll<HTMLButtonElement>('[data-holo-screen]'));
const back = stage.querySelector<HTMLButtonElement>('[data-holo-back]')!;
const rocketButton = stage.querySelector<HTMLButtonElement>('[data-rocket]')!;
const hungButton = stage.querySelector<HTMLButtonElement>('[data-hung-button]')!;
const sayBox = stage.querySelector<HTMLElement>('[data-say]')!;
const backMe = stage.querySelector<HTMLButtonElement>('[data-back-me]')!;
const flingHint = stage.querySelector<HTMLElement>('[data-fling-hint]')!;
const bubble = stage.querySelector<HTMLElement>('[data-bubble]')!;
const LINES = [
	"Hi, I'm Hung!",
	'I build product UI with React, Next.js and TypeScript.',
	'My work is up there. Scroll and we fly!',
];
let line = -1;
const nextLine = () => {
	let k = Math.floor(Math.random() * LINES.length);
	if (k === line) k = (k + 1) % LINES.length;
	line = k;
	return LINES[k];
};
let talkUntil = 0;

function say(text: string) {
	bubble.textContent = text;
	bubble.classList.remove('is-on');
	void bubble.offsetWidth;
	bubble.classList.add('is-on');
	talkUntil = performance.now() + Math.max(2600, text.length * 70);
	launch.actor.face.talk(Math.min(2.6, 0.5 + text.length * 0.045));
}

function hush() {
	if (!talkUntil) return;
	talkUntil = 0;
	bubble.classList.remove('is-on');
}
const flyers = new Flyers(stage);
const launch = new Launch(
	{
		hung: hungButton,
		rocket: rocketButton,
		pad: stage.querySelector<HTMLElement>('[data-pad]')!,
		smoke: stage.querySelector<SVGSVGElement>('[data-smoke]')!,
		ground: [...stage.querySelectorAll<HTMLElement>('[data-meadow], [data-flyers]')],
		sky: [...stage.querySelectorAll<HTMLElement>('[data-clouds]')],
	},
	reduced,
);
const cursor = stage.querySelector<HTMLElement>('.cursor')!;
const doodle = new DoodleCursor(cursor);

const state = {
	yaw: 0,
	yawTarget: 0,
	time: 0,
	hover: -1,
	hoverShown: -1,
	hoverAmt: 0,
	focus: -1,
	focusShown: -1,
	focusAmt: 0,
	focusAt: 0,
	leanX: 0,
	leanY: 0,
	pointer: { x: -9999, y: -9999, inside: false, moved: false },
	sheetOpen: false,
};
const inSolar = () => launch.inSpace;

// Up to the work, or home to the meadow; a second ask during a trip hurries it along.
function fly(v: 0 | 1) {
	hush();
	if (v === 0) unfocus();
	launch.go(v);
}

bindInkLinks({ color: '#f2a541' });

function focusPlanet(k: number) {
	k = wrap(k);
	if (state.focus === k) return;
	state.focus = k;
	state.focusShown = k;
	state.focusAt = performance.now();
	thrown = -1;
	splat.wipe();
	setHolo(false);
	screens.forEach((s, i) => (s.hidden = i !== k));
	holoH = 0;
	back.setAttribute('aria-hidden', 'false');
	back.tabIndex = 0;
}

function unfocus() {
	if (state.focus < 0) return;
	state.focus = -1;
	thrown = -1;
	splat.wipe();
	setHolo(false);
	back.setAttribute('aria-hidden', 'true');
	back.tabIndex = -1;
}

let holoOn = false;
let thrown = -1;
function setHolo(on: boolean) {
	if (on === holoOn) return;
	holoOn = on;
	holo.setAttribute('aria-hidden', String(!on));
	holo.inert = !on;
	holo.classList.toggle('is-painted', on);
}

const sheets = {
	case: document.querySelector<HTMLDialogElement>('[data-sheet="case"]')!,
	archive: document.querySelector<HTMLDialogElement>('[data-sheet="archive"]')!,
};
const sunButton = stage.querySelector<HTMLButtonElement>('[data-open-archive]')!;
const sunLabel = stage.querySelector<HTMLElement>('[data-sun-label]')!;

function setCursorMode(mode: 'plain' | 'label', label = '') {
	doodle.label(mode === 'label' ? label : '');
}

let openedAt = 0;

function showSheet(dialog: HTMLDialogElement) {
	const panel = dialog.querySelector<HTMLElement>('[data-panel]')!;
	panel.scrollTop = 0;
	openedAt = performance.now();
	dialog.showModal();
	state.sheetOpen = true;
	state.hover = -1;
	setCursorMode('plain');
	if (finePointer) dialog.append(cursor);
}

// The sheets move with the Web Animations API, on the site's easing tokens.
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EASE_IN = 'cubic-bezier(0.7, 0, 0.84, 0)';
const offstage = () => (narrow.matches ? 'translateY(100%)' : 'translateX(100%)');

function still(el: HTMLElement) {
	for (const a of el.getAnimations()) a.cancel();
}

function openArchive() {
	const dialog = sheets.archive;
	const panel = dialog.querySelector<HTMLElement>('[data-panel]')!;
	showSheet(dialog);
	still(panel);
	panel.animate(
		[
			{ transform: reduced ? 'none' : offstage(), opacity: reduced ? 0 : 1 },
			{ transform: 'none', opacity: 1 },
		],
		{ duration: reduced ? 200 : 850, easing: EASE_OUT },
	);
}

// The preview on the planet flies into place as the case's photo.
function flipIn(article: HTMLElement, from: DOMRect | null) {
	const frame = article.querySelector<HTMLElement>('[data-flip]');
	const shot = article.querySelector<HTMLElement>('.case-shot');
	sheets.case.classList.toggle('is-flip', !!(frame && shot && from && !reduced));
	if (!frame || !shot || !from || reduced) return;
	still(frame);
	const f = frame.getBoundingClientRect();
	const r = shot.getBoundingClientRect();
	const scale = from.width / r.width;
	const x = from.left - f.left - (r.left - f.left) * scale;
	const y = from.top - f.top - (r.top - f.top) * scale;
	frame.animate([{ transform: `translate(${x}px, ${y}px) scale(${scale})` }, { transform: 'none' }], {
		duration: 850,
		easing: EASE_OUT,
	});
}

function playVideo(article: HTMLElement) {
	const video = article.querySelector<HTMLVideoElement>('[data-video]');
	if (!video) return;
	if (reduced) {
		video.controls = true;
		return;
	}
	video.currentTime = 0;
	video.play().catch(() => (video.controls = true));
}

function openSheet(_name: 'case', k = 0) {
	const dialog = sheets.case;
	const panel = dialog.querySelector<HTMLElement>('[data-panel]')!;
	const article = dialog.querySelector<HTMLElement>(`[data-case="${k}"]`)!;
	dialog.querySelectorAll<HTMLElement>('[data-case]').forEach((a, i) => (a.hidden = i !== k));
	dialog.setAttribute('aria-labelledby', `case-title-${k}`);
	dialog.style.setProperty('--case-bg', solar ? solar.colorOf(k) : '');
	dialog.dataset.pattern = solar ? solar.patternOf(k) : '';
	const flood = splat.painted && state.focus === k;
	const from = flood ? (screens[k].querySelector<HTMLElement>('.holo-frame')?.getBoundingClientRect() ?? null) : null;
	const ox = from ? from.left + from.width / 2 : innerWidth / 2;
	const oy = from ? from.top + from.height / 2 : innerHeight / 2;
	dialog.style.setProperty('--ox', `${Math.round(ox)}px`);
	dialog.style.setProperty('--oy', `${Math.round(oy)}px`);
	focusPlanet(k);
	const reveal = () => {
		showSheet(dialog);
		still(panel);
		if (!flood) panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: EASE_OUT });
		flipIn(article, from);
		playVideo(article);
		requestAnimationFrame(() => dialog.classList.add('is-open'));
	};
	if (flood) {
		splat.floodTo(true);
		window.setTimeout(reveal, reduced ? 0 : 560);
	} else {
		reveal();
	}
}

function closeSheet(dialog: HTMLDialogElement) {
	if (!dialog.open) return;
	const panel = dialog.querySelector<HTMLElement>('[data-panel]')!;
	const done = () => {
		dialog.close();
		state.sheetOpen = false;
		stage.append(cursor);
	};
	if (dialog === sheets.case) {
		dialog.classList.remove('is-open');
		dialog.querySelectorAll<HTMLVideoElement>('[data-video]').forEach((v) => v.pause());
		const out = panel.animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: reduced ? 100 : 300,
			delay: reduced ? 0 : 120,
			easing: EASE_IN,
			fill: 'forwards',
		});
		out.onfinish = () => {
			done();
			dialog.classList.remove('is-flip');
			splat.floodTo(false);
			out.cancel();
		};
		return;
	}
	const out = panel.animate([{}, reduced ? { opacity: 0 } : { transform: offstage() }], {
		duration: reduced ? 150 : 450,
		easing: EASE_IN,
		fill: 'forwards',
	});
	out.onfinish = () => {
		done();
		out.cancel();
	};
}

Object.values(sheets).forEach((dialog) => {
	dialog.addEventListener('cancel', (e) => {
		e.preventDefault();
		closeSheet(dialog);
	});
	dialog.addEventListener('click', (e) => {
		if (e.target === dialog && performance.now() - openedAt > 350) closeSheet(dialog);
	});
	dialog.querySelector('[data-close]')!.addEventListener('click', () => closeSheet(dialog));
});

// A swipe that starts on the rocket or on him is a gesture, not a click.
let swallowClick = false;
rocketButton.addEventListener('click', () => {
	if (swallowClick) return;
	fly(launch.inSpace ? 0 : 1);
});
hungButton.addEventListener('click', () => {
	if (swallowClick || launch.phase !== 'ground') return;
	const text = nextLine();
	if (line === 0) launch.actor.greet(2);
	say(text);
});
backMe.addEventListener('click', () => fly(0));
sunButton.addEventListener('click', openArchive);
screens.forEach((s, i) => s.addEventListener('click', () => openSheet('case', i)));
back.addEventListener('click', unfocus);
picks.forEach((b, i) => {
	// Tabbing to a project from the meadow flies there first, in a hurry.
	b.addEventListener('focus', () => {
		if (!inSolar()) {
			fly(1);
			launch.hurry();
		}
		focusPlanet(i);
	});
	b.addEventListener('click', () => openSheet('case', i));
});

let stepLock = 0;
function stepFocus(dir: number) {
	const now = performance.now();
	if (now < stepLock) return;
	stepLock = now + 450;
	focusPlanet(state.focus + dir);
}

// A scroll gesture is a run of wheel events; momentum keeps them coming after a trip has begun, so one
// gesture sets off at most one trip, and only a fresh gesture hurries a trip along.
const wheel = { sum: 0, at: 0, spent: false };
addEventListener(
	'wheel',
	(e) => {
		if (state.sheetOpen) return;
		const now = performance.now();
		const fresh = now - wheel.at > 260;
		if (fresh) {
			wheel.sum = 0;
			wheel.spent = false;
		}
		wheel.at = now;
		const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
		const vertical = Math.abs(e.deltaY) >= Math.abs(e.deltaX);
		const d = (vertical ? e.deltaY : e.deltaX) * unit;
		if (launch.busy) {
			if (fresh) launch.hurry();
			return;
		}
		if (!inSolar()) {
			// Down the page is up to the work, after a little travel so a stray tick does not launch him.
			wheel.sum += vertical ? d : 0;
			if (wheel.sum > 40 && !wheel.spent) {
				wheel.spent = true;
				fly(1);
			}
			return;
		}
		if (state.focus >= 0) {
			if (Math.abs(d) > 12) stepFocus(Math.sign(d));
			return;
		}
		// Back up the page flies home. Scrolling never spins the system; dragging does.
		if (vertical && d < 0) {
			wheel.sum += d;
			if (wheel.sum < -60 && !wheel.spent) {
				wheel.spent = true;
				fly(0);
			}
		}
	},
	{ passive: true },
);

addEventListener('keydown', (e) => {
	if (state.sheetOpen || e.altKey || e.metaKey || e.ctrlKey) return;
	const next = e.key === 'ArrowRight' || e.key === 'ArrowDown';
	const prev = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
	if (launch.busy) {
		if (next || prev || e.key === 'Escape') launch.hurry();
		return;
	}
	if (!inSolar()) {
		if (next) {
			e.preventDefault();
			fly(1);
		}
		return;
	}
	if (next || prev) {
		e.preventDefault();
		if (state.focus >= 0) stepFocus(next ? 1 : -1);
		else focusPlanet(next ? 0 : n - 1);
	} else if (e.key === 'Escape' && state.focus >= 0) {
		unfocus();
	} else if (e.key === 'Escape') {
		fly(0);
	} else if (e.key === 'Enter' && state.focus >= 0 && !(e.target as HTMLElement).closest('a, button')) {
		e.preventDefault();
		openSheet('case', state.focus);
	}
});

const drag = {
	on: false,
	id: -1,
	planet: -1,
	sun: false,
	// Started on the rocket or on him: tracked for a swipe, but the button keeps its click.
	soft: false,
	fired: false,
	startX: 0,
	startY: 0,
	lastX: 0,
	lastY: 0,
	lastT: 0,
	moved: 0,
	speed: 0,
};

stage.addEventListener('pointerdown', (e) => {
	const target = e.target as HTMLElement;
	const soft = !!target.closest('[data-rocket], [data-hung-button]');
	if (!soft && target.closest('a, button, [data-hud]')) return;
	swallowClick = false;
	drag.on = true;
	drag.soft = soft;
	drag.fired = false;
	drag.id = e.pointerId;
	drag.startX = e.clientX;
	drag.startY = e.clientY;
	drag.lastX = e.clientX;
	drag.lastY = e.clientY;
	drag.lastT = performance.now();
	drag.moved = 0;
	drag.speed = 0;
	drag.planet = -1;
	drag.sun = false;
	if (solar && inSolar() && state.focus < 0) {
		const k = solar.pick(e.clientX, e.clientY);
		if (k >= 0 && solar.grab(k, e.clientX, e.clientY)) drag.planet = k;
		else drag.sun = solar.overSun(e.clientX, e.clientY);
	}
	if (!soft) stage.setPointerCapture(e.pointerId);
});

stage.addEventListener('pointermove', (e) => {
	state.pointer.x = e.clientX;
	state.pointer.y = e.clientY;
	state.pointer.inside = true;
	state.pointer.moved = true;
	if (!drag.on || e.pointerId !== drag.id) return;
	const dx = e.clientX - drag.lastX;
	const dy = e.clientY - drag.lastY;
	const d = Math.abs(dx) >= Math.abs(dy) ? dx : -dy;
	const now = performance.now();
	drag.moved += Math.abs(d);
	drag.lastX = e.clientX;
	drag.lastY = e.clientY;
	if (drag.planet >= 0) {
		solar?.moveHand(e.clientX, e.clientY);
		if (drag.moved > 6) setCursorMode('label', 'Whee!');
		return;
	}
	// Swipe up on the meadow to launch, down in space to fly home.
	const pullX = e.clientX - drag.startX;
	const pullY = e.clientY - drag.startY;
	const upright = Math.abs(pullY) > Math.abs(pullX) * 1.4;
	if (!inSolar()) {
		if (!drag.fired && upright && pullY < -60 && !launch.busy) {
			drag.fired = true;
			fly(1);
		}
		return;
	}
	if (state.focus >= 0) return;
	if (!drag.fired && upright && pullY > 80) {
		drag.fired = true;
		fly(0);
		return;
	}
	// Only a sideways drag turns the system; an up-and-down swipe is a scroll, and scrolls don't spin it.
	if (upright) return;
	const delta = -dx * (narrow.matches ? 0.008 : 0.0045);
	state.yawTarget += delta;
	drag.speed = delta / Math.max(1, now - drag.lastT);
	drag.lastT = now;
});

function endDrag(e: PointerEvent) {
	if (!drag.on || e.pointerId !== drag.id) return;
	drag.on = false;
	if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
	if (drag.soft || drag.fired) {
		swallowClick = drag.fired || drag.moved > 10;
		return;
	}
	if (launch.busy) {
		if (drag.moved < 6) launch.hurry();
		return;
	}
	if (drag.planet >= 0) {
		const k = drag.planet;
		drag.planet = -1;
		solar?.release();
		if (drag.moved < 6 && e.type === 'pointerup') {
			focusPlanet(k);
		} else {
			flung = true;
			setCursorMode('plain');
		}
		return;
	}
	if (!inSolar()) return;
	if (drag.sun && drag.moved < 6 && e.type === 'pointerup') {
		drag.sun = false;
		openArchive();
		return;
	}
	if (drag.moved < 6 && e.type === 'pointerup') {
		const k = solar ? solar.pick(e.clientX, e.clientY, state.focus) : -1;
		if (k >= 0) focusPlanet(k);
		else if (state.focus >= 0) unfocus();
		return;
	}
	if (state.focus >= 0) {
		const swipe = e.clientX - drag.startX;
		if (Math.abs(swipe) > 40) stepFocus(swipe < 0 ? 1 : -1);
		return;
	}
	state.yawTarget += drag.speed * 260;
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('pointerleave', () => {
	state.pointer.inside = false;
	state.hover = -1;
	if (!state.sheetOpen) cursor.classList.remove('is-on');
});

let solar: Solar | null = null;
let sunHover = false;
let sunHoverAmt = 0;
let sunBox = '';
let flung = false;
const splat = new Splat(splatCanvas);

// The system hangs a screen above the meadow; the camera brings it down as the rocket climbs.
function tripView(): SolarView | null {
	if (!solar || launch.sysOffset === 0) return null;
	const w = innerWidth;
	const h = innerHeight;
	return { cx: w / 2, cy: solar.centerY + launch.sysOffset, s: 1, clip: { x: 0, y: 0, w, h, r: 0 } };
}

function layout() {
	solar?.layout(innerWidth, innerHeight);
	launch.layout(innerWidth, innerHeight);
	if (!narrow.matches) backMe.style.left = `${Math.round(launch.noseInSpace().x + 28)}px`;
	else backMe.style.left = '';
	flyers.resize(innerWidth, innerHeight);
	splat.resize(innerWidth, innerHeight);
	holoSize();
}

let holoH = 0;
function holoSize() {
	const w = Math.min(420, innerWidth * (innerWidth < 768 ? 0.66 : 0.74), innerHeight * 0.36 * 1.6);
	holo.style.setProperty('--holo-w', `${Math.round(w)}px`);
	holoH = 0;
}

let resizeTimer = 0;
addEventListener('resize', () => {
	clearTimeout(resizeTimer);
	resizeTimer = window.setTimeout(layout, 150);
});

const TIERS = [1, 0.9, 0.82, 0.75];
const perf = {
	tier: (navigator.hardwareConcurrency || 8) <= 4 || matchMedia('(pointer: coarse)').matches ? 1 : 0,
	frames: 0,
	interval: 0,
	work: 0,
	calm: 0,
	holdUntil: 0,
};

function applyTier() {
	solar?.setQuality(TIERS[perf.tier]);
}

function govern(now: number, interval: number, work: number) {
	if (document.hidden || interval > 250) return;
	perf.frames++;
	perf.interval += interval;
	perf.work += work;
	if (perf.frames < 40) return;
	const avg = perf.interval / perf.frames;
	const busy = perf.work / perf.frames;
	perf.frames = perf.interval = perf.work = 0;
	if (avg > 17.6 && perf.tier < TIERS.length - 1) {
		perf.tier++;
		perf.calm = 0;
		perf.holdUntil = now + 8000;
		applyTier();
	} else if (avg < 17.2 && busy < 5 && perf.tier > 0 && now > perf.holdUntil) {
		if (++perf.calm >= 4) {
			perf.tier--;
			perf.calm = 0;
			perf.holdUntil = now + 4000;
			applyTier();
		}
	} else {
		perf.calm = 0;
	}
}

function placeHolo() {
	if (!solar || state.focusShown < 0) return;
	const d = solar.focusDisc;
	if (!holoH) holoH = holo.offsetHeight;
	const w = parseFloat(holo.style.getPropertyValue('--holo-w')) || 416;
	const bottom = d.y - d.r * 1.1 - 56;
	const top = Math.max(innerWidth < 768 ? 210 : 96, bottom - holoH);
	const left = d.x - w / 2;
	holo.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
	const pad = innerWidth < 768 ? 22 : 36;
	const box = { x: left - pad, y: top - pad, w: w + pad * 2, h: holoH + pad * 2 + 16 };
	if (state.focus >= 0 && state.focusAmt > 0.8 && thrown !== state.focus) {
		thrown = state.focus;
		const hud = [...stage.querySelectorAll<HTMLElement>('.corner')].map((el) => {
			const r = el.getBoundingClientRect();
			return { x: r.left, y: r.top, w: r.width, h: r.height };
		});
		splat.throw(d.x, d.y - d.r, box, solar.colorOf(state.focus), hud);
	} else if (thrown === state.focus) {
		splat.follow(box);
	}
	setHolo(state.focus >= 0 && thrown === state.focus && splat.painted);
}

// The speech bubble rides above his head.
let sayAt = '';
function placeSay() {
	if (talkUntil && performance.now() > talkUntil) hush();
	const head = launch.head();
	const x = Math.round(head.x + (narrow.matches ? 0 : 46 * head.s));
	const y = Math.round(head.y - 12 * head.s);
	const key = `${x},${y}`;
	if (key === sayAt) return;
	sayAt = key;
	sayBox.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

// In space the rocket fades when a planet or a label slides behind it, and lets the pointer through to them.
const labelEls = [...labels, sunLabel];
const veil = { amt: 1, goal: 1, at: 0, shown: '' };
function updateVeil(now: number, dt: number) {
	if (!launch.inSpace || !solar || reduced) {
		veil.goal = 1;
	} else if (now - veil.at > 100) {
		veil.at = now;
		const boxes = labelEls
			.filter((el) => Number(el.style.opacity || 0) > 0.2)
			.map((el) => el.getBoundingClientRect());
		const behind = (p: { x: number; y: number }) =>
			solar!.pick(p.x, p.y) >= 0 || boxes.some((b) => p.x > b.left - 8 && p.x < b.right + 8 && p.y > b.top - 8 && p.y < b.bottom + 8);
		veil.goal = launch.veilPoints().some(behind) ? 0.22 : 1;
	}
	veil.amt += (veil.goal - veil.amt) * ease(veil.goal < veil.amt ? 9 : 4, dt);
	if (Math.abs(veil.goal - veil.amt) < 0.005) veil.amt = veil.goal;
	const shown = veil.amt.toFixed(2);
	if (shown === veil.shown) return;
	veil.shown = shown;
	rocketButton.style.opacity = veil.amt < 1 ? shown : '';
	rocketButton.classList.toggle('is-veiled', veil.amt < 0.6);
}

let raf = 0;
let last = performance.now();
let pickTick = 0;
let solarDrawn = true;

function frame(now: number) {
	const interval = now - last;
	const dt = Math.min(0.05, interval / 1000);
	last = now;
	raf = requestAnimationFrame(frame);
	if (sheets.case.open) {
		doodle.tick(now);
		return;
	}

	launch.update(dt, now, finePointer && state.pointer.inside ? state.pointer : null);
	placeSay();
	const solarMode = inSolar();
	const showBack = solarMode && state.focus < 0;
	if (showBack !== (backMe.getAttribute('aria-hidden') === 'false')) {
		backMe.setAttribute('aria-hidden', String(!showBack));
		backMe.tabIndex = showBack ? 0 : -1;
		sunButton.setAttribute('aria-hidden', String(!showBack));
		sunButton.tabIndex = showBack ? 0 : -1;
	}
	if (stage.classList.contains('in-solar') !== solarMode) stage.classList.toggle('in-solar', solarMode);
	const inkAge = launch.inkAge;
	const hint = solarMode && state.focus < 0 && !flung && !state.sheetOpen && inkAge > 1.8 && inkAge < 12;
	if (flingHint.classList.contains('is-on') !== hint) flingHint.classList.toggle('is-on', hint);
	if (rocketButton.dataset.phase !== launch.phase) {
		rocketButton.dataset.phase = launch.phase;
		rocketButton.setAttribute('aria-label', launch.inSpace ? 'Fly home' : 'Fly to my work');
		hungButton.inert = launch.phase !== 'ground';
		setCursorMode('plain');
	}

	if (launch.progress < 1 && !reduced) {
		flyers.update(now / 1000);
	}

	if (!reduced) state.time += dt * (state.focus >= 0 ? 0.25 : 1);
	const prev = state.yaw;
	state.yaw += (state.yawTarget - state.yaw) * ease(reduced ? 12 : 4, dt);
	const v = dt > 0 ? (state.yaw - prev) / dt : 0;

	const goal = state.focus >= 0 ? 1 : 0;
	state.focusAmt += (goal - state.focusAmt) * (reduced ? 1 : ease(goal ? 3.6 : 4.5, dt));
	if (goal === 0 && state.focusAmt < 0.01) state.focusShown = -1;

	if (solar && finePointer && state.pointer.inside && !drag.on && !state.sheetOpen) {
		if (state.pointer.moved || (Math.abs(v) > 0.02 && ++pickTick % 2 === 0)) {
			const over = (document.elementFromPoint(state.pointer.x, state.pointer.y) as HTMLElement | null)?.closest(
				'a, button',
			);
			state.hover = over || !solarMode ? -1 : solar.pick(state.pointer.x, state.pointer.y, state.focus);
			sunHover =
				!over && solarMode && state.focus < 0 && state.hover < 0 && solar.overSun(state.pointer.x, state.pointer.y);
			state.pointer.moved = false;
			if (sunHover) setCursorMode('label', 'Archive');
			else if (over === rocketButton) setCursorMode('label', launch.inSpace ? 'Fly home' : 'Launch');
			else if (over === hungButton) setCursorMode('label', 'Say hi');
			else if (over?.matches('[data-holo-screen]')) setCursorMode('label', 'Open');
			else if (!over && !doodle.magnet)
				setCursorMode(state.hover >= 0 ? 'label' : 'plain', state.hover >= 0 ? 'View' : '');
		}
	}
	if (state.hover >= 0) state.hoverShown = state.hover;
	if (!solarMode || state.focus >= 0 || state.sheetOpen || !state.pointer.inside) sunHover = false;
	sunHoverAmt += ((sunHover && !reduced ? 1 : 0) - sunHoverAmt) * ease(sunHover ? 8 : 5, dt);
	const hoverGoal = state.hover >= 0 && !reduced ? 1 : 0;
	state.hoverAmt += (hoverGoal - state.hoverAmt) * ease(hoverGoal ? 4.5 : 2.6, dt);

	const lean = state.pointer.inside && state.focus < 0 && solarMode;
	const lx = lean ? state.pointer.x / innerWidth - 0.5 : 0;
	const ly = lean ? state.pointer.y / innerHeight - 0.5 : 0;
	state.leanX += (lx - state.leanX) * ease(2, dt);
	state.leanY += (ly - state.leanY) * ease(2, dt);

	// The system is drawn only once the camera is near enough to see it.
	const sysVisible = launch.sysOffset > -innerHeight * 1.2;
	if (solar && (sysVisible || solarDrawn)) {
		solarDrawn = sysVisible;
		const swing = inkAge >= 0 && inkAge < 1.8 ? 0.5 * (1 - inkAge / 1.8) ** 2 : 0;
		solar.render(
			{
				yaw: state.yaw,
				time: state.time,
				hover: state.hoverShown,
				hoverAmt: state.hoverAmt,
				intro: launch.intro,
				focus: state.focusShown,
				focusAmt: state.focusAmt,
				leanX: reduced ? 0 : state.leanX,
				leanY: reduced ? 0 : state.leanY,
				turn: reduced ? 0 : swing,
				view: tripView(),
				labels: solarMode ? 1 : 0,
				ink: reduced || inkAge > 2.4 ? -1 : inkAge,
				sunHover: sunHoverAmt,
			},
			now,
		);
	}
	if (solar && solarMode) {
		const d = solar.sunDisc;
		const box = `${Math.round(d.x - d.r)},${Math.round(d.y - d.r)},${Math.round(d.r * 2)}`;
		if (box !== sunBox) {
			sunBox = box;
			sunButton.style.transform = `translate3d(${Math.round(d.x - d.r)}px, ${Math.round(d.y - d.r)}px, 0)`;
			sunButton.style.width = sunButton.style.height = `${Math.round(d.r * 2)}px`;
		}
	}
	updateVeil(now, dt);
	placeHolo();
	splat.draw(now);

	doodle.tick(now);

	govern(now, interval, performance.now() - now);
}

document.addEventListener('visibilitychange', () => {
	cancelAnimationFrame(raf);
	if (!document.hidden) {
		last = performance.now();
		raf = requestAnimationFrame(frame);
	}
});

function start() {
	solar = new Solar(solarCanvas, n, labels, sunLabel);
	solar.calm = reduced;
	solar.setQuality(TIERS[perf.tier]);
	layout();

	launch.onHome = () => {
		launch.actor.greet(2);
		say('Welcome back!');
	};
	root.classList.add('is-ready');
	// He says hello once the page has settled, then, if nobody has touched anything, how to see the work.
	let touched = false;
	for (const type of ['wheel', 'pointerdown', 'keydown']) addEventListener(type, () => (touched = true), { once: true, passive: true });
	window.setTimeout(() => {
		if (launch.phase !== 'ground' || talkUntil) return;
		line = 0;
		launch.actor.greet(3);
		say(LINES[0]);
	}, reduced ? 400 : 1300);
	window.setTimeout(() => {
		if (touched || launch.phase !== 'ground' || talkUntil) return;
		line = 2;
		say(LINES[2]);
	}, reduced ? 3400 : 4600);
	last = performance.now();
	raf = requestAnimationFrame(frame);
}

start();
