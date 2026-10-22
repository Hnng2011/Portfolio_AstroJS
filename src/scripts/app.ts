import { gsap } from 'gsap';
import { projects } from '../data/portfolio';
import { Birds } from '../lib/birds';
import { Flyers } from '../lib/flyers';
import { DoodleCursor } from '../lib/cursor';
import { bindInkLinks } from '../lib/ink';
import { Solar, TUNING as SOLAR_TUNING, type SolarView } from '../lib/solar';
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
const meBack = stage.querySelector<HTMLElement>('[data-me="back"]')!;
const meFront = stage.querySelector<HTMLElement>('[data-me="front"]')!;
const cubeFace = meBack.querySelector<SVGRectElement>('[data-cube-face]')!;
const cubeButton = stage.querySelector<HTMLButtonElement>('[data-cube]')!;
const backMe = stage.querySelector<HTMLButtonElement>('[data-back-me]')!;
const meadow = stage.querySelector<HTMLElement>('[data-meadow]')!;
const talkButton = stage.querySelector<HTMLButtonElement>('[data-talk]')!;
const bubble = stage.querySelector<HTMLElement>('[data-bubble]')!;
const LINES = [
	"Hi, I'm Hung!",
	'I build product UI with React, Next.js and TypeScript.',
	'My work is in this cube. Scroll to step in!',
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
	for (const el of [meBack, meFront]) el.classList.add('is-talking');
}

function hush() {
	if (!talkUntil) return;
	talkUntil = 0;
	bubble.classList.remove('is-on');
	for (const el of [meBack, meFront]) el.classList.remove('is-talking');
}
const flyerLayers = [...stage.querySelectorAll<HTMLElement>('[data-flyers], [data-clouds], [data-sky-birds]')];
const flyers = new Flyers(stage);
const birds = new Birds(stage);
const walk = {
	x: 0,
	y: 0,
	dir: 1,
	pause: 0,
	active: !reduced,
	idle: 0,
	phase: 0,
	moving: false,
	started: false,
	side: false,
	turn: 0,
};
const cursor = stage.querySelector<HTMLElement>('.cursor')!;
const doodle = new DoodleCursor(cursor);
const clock = stage.querySelector<HTMLElement>('[data-clock]')!;

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
	zoom: 0,
	zoomTarget: 0,
	zoomInput: 0,
};
const inSolar = () => state.zoom >= 0.999 && state.zoomTarget === 1;

function zoomTo(v: number) {
	hush();
	walk.active = false;
	walk.idle = 0;
	state.zoomTarget = v;
	state.zoomInput = 0;
	if (v === 0) unfocus();
}
const intro = { v: reduced ? 1 : 0 };

bindInkLinks({ color: '#f2a541' });

const clockFmt = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'Asia/Ho_Chi_Minh',
	hour: '2-digit',
	minute: '2-digit',
	hour12: false,
});
const tickClock = () => (clock.textContent = clockFmt.format(new Date()));
tickClock();
setInterval(tickClock, 15000);

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
};

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
	if (finePointer) dialog.append(cursor);
}

function openSheet(name: keyof typeof sheets, k = 0) {
	const dialog = sheets[name];
	const panel = dialog.querySelector<HTMLElement>('[data-panel]')!;
	dialog.querySelectorAll<HTMLElement>('[data-case]').forEach((a, i) => (a.hidden = i !== k));
	dialog.setAttribute('aria-labelledby', `case-title-${k}`);
	dialog.style.setProperty('--case-bg', solar ? solar.colorOf(k) : '');
	const flood = splat.painted && state.focus === k;
	focusPlanet(k);
	const reveal = () => {
		showSheet(dialog);
		gsap.set(panel, { xPercent: 0, yPercent: 0 });
		gsap.fromTo(panel, { opacity: flood ? 1 : 0 }, { opacity: 1, duration: flood ? 0 : 0.35, ease: 'power2.out' });
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
		gsap.to(panel, {
			opacity: 0,
			duration: reduced ? 0.1 : 0.3,
			delay: reduced ? 0 : 0.12,
			ease: 'power2.in',
			onComplete: () => {
				done();
				splat.floodTo(false);
			},
		});
		return;
	}
	const to = narrow.matches ? { yPercent: 100 } : { xPercent: -100 };
	gsap.to(panel, {
		...(reduced ? { opacity: 0 } : to),
		duration: reduced ? 0.15 : 0.45,
		ease: 'power3.in',
		onComplete: done,
	});
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

cubeButton.addEventListener('click', () => zoomTo(1));
talkButton.addEventListener('click', () => say(nextLine()));
backMe.addEventListener('click', () => zoomTo(0));
screens.forEach((s, i) => s.addEventListener('click', () => openSheet('case', i)));
back.addEventListener('click', unfocus);
picks.forEach((b, i) => {
	b.addEventListener('focus', () => focusPlanet(i));
	b.addEventListener('click', () => openSheet('case', i));
});

let stepLock = 0;
function stepFocus(dir: number) {
	const now = performance.now();
	if (now < stepLock) return;
	stepLock = now + 450;
	focusPlanet(state.focus + dir);
}

addEventListener(
	'wheel',
	(e) => {
		if (state.sheetOpen) return;
		const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
		const d = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * unit;
		if (!inSolar()) {
			const step = Math.max(-120, Math.min(120, d));
			hush();
			walk.active = false;
			walk.idle = 0;
			state.zoomTarget = Math.min(1, Math.max(0, state.zoomTarget + step * 0.0016));
			state.yawTarget += step * 0.006;
			state.zoomInput = performance.now();
			return;
		}
		if (state.focus >= 0) {
			if (Math.abs(d) > 12) stepFocus(Math.sign(d));
			return;
		}
		state.yawTarget += Math.max(-160, Math.min(160, d)) * 0.0022;
	},
	{ passive: true },
);

addEventListener('keydown', (e) => {
	if (state.sheetOpen || e.altKey || e.metaKey || e.ctrlKey) return;
	const next = e.key === 'ArrowRight' || e.key === 'ArrowDown';
	const prev = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
	if (!inSolar()) {
		if (next) {
			e.preventDefault();
			zoomTo(1);
		} else if (prev) {
			e.preventDefault();
			zoomTo(0);
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
		zoomTo(0);
	} else if (e.key === 'Enter' && state.focus >= 0 && !(e.target as HTMLElement).closest('a, button')) {
		e.preventDefault();
		openSheet('case', state.focus);
	}
});

const drag = {
	on: false,
	id: -1,
	startX: 0,
	lastX: 0,
	lastY: 0,
	lastT: 0,
	moved: 0,
	speed: 0,
};

stage.addEventListener('pointerdown', (e) => {
	if ((e.target as HTMLElement).closest('a, button, [data-hud]')) return;
	drag.on = true;
	drag.id = e.pointerId;
	drag.startX = e.clientX;
	drag.lastX = e.clientX;
	drag.lastY = e.clientY;
	drag.lastT = performance.now();
	drag.moved = 0;
	drag.speed = 0;
	stage.setPointerCapture(e.pointerId);
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
	if (!inSolar()) {
		hush();
		walk.active = false;
		walk.idle = 0;
		state.zoomTarget = Math.min(1, Math.max(0, state.zoomTarget - dy * (narrow.matches ? 0.004 : 0.0025)));
		state.yawTarget -= dy * 0.012;
		state.zoomInput = now;
		return;
	}
	if (state.focus >= 0) return;
	const delta = -d * (narrow.matches ? 0.008 : 0.0045);
	state.yawTarget += delta;
	drag.speed = delta / Math.max(1, now - drag.lastT);
	drag.lastT = now;
});

function endDrag(e: PointerEvent) {
	if (!drag.on || e.pointerId !== drag.id) return;
	drag.on = false;
	if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
	if (!inSolar()) return;
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
const splat = new Splat(splatCanvas);

const face = { x: 0, y: 0, w: 1, h: 1 };
function measureFace() {
	for (const el of [meBack, meFront]) el.style.transform = '';
	const r = cubeFace.getBoundingClientRect();
	const m = meBack.getBoundingClientRect();
	face.x = r.left;
	face.y = r.top;
	face.w = r.width;
	face.h = r.height;
	const origin = `${r.left + r.width / 2 - m.left}px ${r.top + r.height / 2 - m.top}px`;
	for (const el of [meBack, meFront]) el.style.transformOrigin = origin;
	lastZoomStyle = -1;
}

let lastZoomStyle = -1;
let lastMeTransform = '';
let lastMeFade = '';
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
function zoomView(): SolarView | null {
	const e = easeInOut(state.zoom);
	if (e >= 0.999 || !solar) {
		if (lastZoomStyle !== 1) {
			lastZoomStyle = 1;
			for (const el of [meBack, meFront, meadow, ...flyerLayers]) el.style.visibility = 'hidden';
			lastMeTransform = '';
			root.classList.remove('is-zooming');
		}
		return null;
	}
	const w = innerWidth;
	const h = innerHeight;
	const fx = face.x + face.w / 2 + walk.x * (1 - e);
	const fy = face.y + face.h / 2 + walk.y * (1 - e);
	const rx = face.x + face.w / 2;
	const ry = face.y + face.h / 2;
	const tx = w / 2;
	const ty = solar.centerY;
	const cx = fx + (tx - fx) * e;
	const cy = fy + (ty - fy) * e;
	const k = Math.max(face.w / w, face.h / h);
	const g = Math.pow(1 / k, e);
	const s = k * g;
	const side = face.w * g;
	const open = Math.min(1, Math.max(0, (e - 0.45) / 0.55));
	const stretch = open * open * (3 - 2 * open);
	const cw = side + (Math.max(side, w * 1.2) - side) * stretch;
	const ch = side + (Math.max(side, (h / 2 + Math.abs(ty - h / 2)) * 2.4) - side) * stretch;
	if (Math.abs(e - lastZoomStyle) > 0.0005 || (state.zoom > 0 && state.zoom < 0.2) || walk.moving || e === 0) {
		lastZoomStyle = e;
		const t = `translate3d(${cx - rx}px, ${cy - ry}px, 0) scale(${g})`;
		const scene = String(Math.max(0, 1 - e * 2.4));
		if (meadow.style.opacity !== scene) {
			meadow.style.opacity = scene;
			for (const el of flyerLayers) el.style.opacity = scene;
		}
		const fade = String(1 - Math.min(1, Math.max(0, (e - 0.4) / 0.4)));
		if (t !== lastMeTransform || fade !== lastMeFade) {
			lastMeTransform = t;
			lastMeFade = fade;
			for (const el of [meBack, meFront]) {
				el.style.transform = t;
				el.style.opacity = fade;
				el.style.visibility = '';
			}
			for (const el of [meadow, ...flyerLayers]) el.style.visibility = '';
		}
		meFront.style.setProperty('--pop', String(Math.min(1, state.zoom * 6)));
		root.classList.toggle('is-zooming', e > 0.001);
	}
	return { cx, cy, s, clip: { x: cx - cw / 2, y: cy - ch / 2, w: cw, h: ch, r: 5 * g * (1 - stretch) } };
}

function layout() {
	solar?.layout(innerWidth, innerHeight);
	measureFace();
	flyers.resize(innerWidth, innerHeight);
	birds.resize(innerWidth, innerHeight);
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

function walkRange() {
	return narrow.matches ? innerWidth * 0.12 : Math.min(innerWidth * 0.3, 440);
}

let walkClass = '';
function updateWalk(dt: number) {
	const atRest = state.zoomTarget === 0 && state.zoom < 0.001;
	if (talkUntil && performance.now() > talkUntil) hush();
	const talking = talkUntil > 0;
	if (!walk.active && atRest && !reduced) {
		walk.idle += dt;
		if (walk.idle > 0.8) walk.active = true;
	}
	const range = walkRange();
	if (!walk.started) {
		walk.started = true;
		walk.x = reduced ? 0 : -range;
	}
	walk.moving = false;
	if (talking) {
		walk.moving = false;
	} else if (walk.active && atRest) {
		if (walk.pause > 0) {
			walk.pause -= dt;
		} else {
			walk.x += walk.dir * (narrow.matches ? 46 : 78) * dt;
			walk.moving = true;
			if (Math.abs(walk.x) >= range) {
				walk.x = Math.sign(walk.x) * range;
				walk.dir = -Math.sign(walk.x);
				walk.pause = 0.35;
			}
		}
	} else {
		walk.x = Math.max(-range, Math.min(range, walk.x));
	}
	walk.phase += walk.moving ? dt * 15 : 0;
	walk.y = walk.moving ? -Math.abs(Math.sin(walk.phase * 0.84)) * 8 : walk.y * (1 - ease(10, dt));
	const strolling = walk.active && atRest && !talking;
	walk.side = strolling;
	const turnGoal = strolling ? walk.dir * SOLAR_TUNING.carryTurn : 0;
	walk.turn += (turnGoal - walk.turn) * (reduced ? 1 : ease(7, dt));
	const cls = `${walk.moving ? 'm' : ''}${strolling ? (walk.dir > 0 ? 'r' : 'l') : ''}`;
	if (cls !== walkClass) {
		walkClass = cls;
		for (const el of [meBack, meFront]) {
			el.classList.toggle('is-walking', walk.moving);
			el.classList.toggle('is-side', strolling);
			el.classList.toggle('face-left', strolling && walk.dir < 0);
		}
	}
}

let raf = 0;
let last = performance.now();
let pickTick = 0;

function frame(now: number) {
	const interval = now - last;
	const dt = Math.min(0.05, interval / 1000);
	last = now;
	raf = requestAnimationFrame(frame);
	if (sheets.case.open) {
		doodle.tick(now);
		return;
	}

	if (state.zoomInput && now - state.zoomInput > 420 && state.zoomTarget > 0 && state.zoomTarget < 1) {
		state.zoomTarget = state.zoomTarget > 0.3 ? 1 : 0;
		state.zoomInput = 0;
	}
	const zoomRate = state.zoomInput ? 10 : 2.6;
	state.zoom += (state.zoomTarget - state.zoom) * (reduced ? 1 : ease(zoomRate, dt));
	if (Math.abs(state.zoomTarget - state.zoom) < 0.0008) state.zoom = state.zoomTarget;
	const solarMode = inSolar();
	const showBack = solarMode && state.focus < 0;
	if (showBack !== (backMe.getAttribute('aria-hidden') === 'false')) {
		backMe.setAttribute('aria-hidden', String(!showBack));
		backMe.tabIndex = showBack ? 0 : -1;
	}
	if (meFront.inert !== solarMode) {
		meFront.inert = solarMode;
		cubeButton.tabIndex = solarMode ? -1 : 0;
		setCursorMode('plain');
	}

	updateWalk(dt);
	if (state.zoom < 0.999 && !reduced) {
		flyers.update(now / 1000);
		birds.update(now / 1000, dt);
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
			state.pointer.moved = false;
			if (over === cubeButton) setCursorMode('label', 'Open');
			else if (over === talkButton) setCursorMode('label', 'Say hi');
			else if (over?.matches('[data-holo-screen]')) setCursorMode('label', 'Open');
			else if (!over && !doodle.magnet) setCursorMode(state.hover >= 0 ? 'label' : 'plain', state.hover >= 0 ? 'View' : '');
		}
	}
	if (state.hover >= 0) state.hoverShown = state.hover;
	const hoverGoal = state.hover >= 0 && !reduced ? 1 : 0;
	state.hoverAmt += (hoverGoal - state.hoverAmt) * ease(hoverGoal ? 4.5 : 2.6, dt);

	const lean = state.pointer.inside && state.focus < 0 && solarMode;
	const lx = lean ? state.pointer.x / innerWidth - 0.5 : 0;
	const ly = lean ? state.pointer.y / innerHeight - 0.5 : 0;
	state.leanX += (lx - state.leanX) * ease(2, dt);
	state.leanY += (ly - state.leanY) * ease(2, dt);

	if (solar) {
		solar.render(
			{
				yaw: state.yaw,
				time: state.time,
				hover: state.hoverShown,
				hoverAmt: state.hoverAmt,
				intro: intro.v,
				focus: state.focusShown,
				focusAmt: state.focusAmt,
				leanX: reduced ? 0 : state.leanX,
				leanY: reduced ? 0 : state.leanY,
				turn: walk.turn,
				view: zoomView(),
				labels: solarMode ? 1 : 0,
			},
			now,
		);
	}
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
	solar = new Solar(solarCanvas, n, labels);
	solar.setQuality(TIERS[perf.tier]);
	layout();

	if (reduced) {
		root.classList.add('is-ready');
	} else {
		gsap
			.timeline()
			.to(intro, { v: 1, duration: 2.6, ease: 'power2.out' }, 0.2)
			.call(() => root.classList.add('is-ready'), [], 0.7)
			.call(
				() => {
					if (state.zoomTarget === 0 && !talkUntil) {
						line = 0;
						say(LINES[0]);
					}
				},
				[],
				2.4,
			);
	}
	last = performance.now();
	raf = requestAnimationFrame(frame);
}

start();
