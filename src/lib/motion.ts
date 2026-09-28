import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

export const reduced =
	typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis: Lenis | null = null;

export function initLenis(): Lenis | null {
	if (reduced || lenis) return lenis;
	lenis = new Lenis({ duration: 1.15, smoothWheel: true, touchMultiplier: 1.6 });
	lenis.on('scroll', () => ScrollTrigger.update());
	gsap.ticker.add((time) => lenis?.raf(time * 1000));
	gsap.ticker.lagSmoothing(0);

	document.addEventListener('click', (e) => {
		const link = (e.target as HTMLElement).closest('a[href^="#"]');
		if (!link) return;
		const id = link.getAttribute('href')!;
		if (id.length < 2) return;
		const target = document.querySelector(id);
		if (!target) return;
		e.preventDefault();
		lenis?.scrollTo(target as HTMLElement, { offset: 0, duration: 1.4 });
	});
	return lenis;
}

export function scrollToEl(selector: string) {
	const target = document.querySelector(selector);
	if (target) lenis?.scrollTo(target as HTMLElement, { offset: 0, duration: 1.4 });
}

const GLYPHS = '█▓▒░<>/\\|=+*#01';

export function scramble(el: HTMLElement, finalText: string, duration = 1.1) {
	if (reduced) {
		el.textContent = finalText;
		return;
	}
	const chars = finalText.split('');
	const obj = { p: 0 };
	gsap.to(obj, {
		p: 1,
		duration,
		ease: 'power2.inOut',
		onUpdate: () => {
			const reveal = Math.floor(obj.p * chars.length);
			el.textContent = chars
				.map((c, i) => {
					if (i < reveal || c === ' ') return c;
					return GLYPHS[(Math.random() * GLYPHS.length) | 0];
				})
				.join('');
		},
		onComplete: () => {
			el.textContent = finalText;
		},
	});
}

export function revealWipe(
	el: Element,
	opts: { dur?: number; delay?: number; start?: string } = {},
) {
	if (reduced) return;
	gsap.fromTo(
		el,
		{ opacity: 0, clipPath: 'inset(0 0 100% 0)' },
		{
			opacity: 1,
			clipPath: 'inset(0 0 0% 0)',
			duration: opts.dur ?? 0.9,
			delay: opts.delay ?? 0,
			ease: 'power3.out',
			clearProps: 'clipPath,opacity',
			scrollTrigger: { trigger: el, start: opts.start ?? 'top 90%', once: true },
		},
	);
}

export function magnetic(el: HTMLElement, strength = 0.35) {
	if (reduced) return;
	const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'elastic.out(1, 0.4)' });
	const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'elastic.out(1, 0.4)' });
	el.addEventListener('pointermove', (e) => {
		const r = el.getBoundingClientRect();
		xTo((e.clientX - (r.left + r.width / 2)) * strength);
		yTo((e.clientY - (r.top + r.height / 2)) * strength);
	});
	el.addEventListener('pointerleave', () => {
		xTo(0);
		yTo(0);
	});
}

export { gsap, ScrollTrigger, SplitText };
