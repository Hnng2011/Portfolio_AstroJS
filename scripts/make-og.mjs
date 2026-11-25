// Renders the link-preview card (public/og.png, 1200x630) from the real home screen.
// Usage: npm run build && node scripts/make-og.mjs
// Uses reduced motion so the doodle faces the camera with the "my work" cube instead of walking.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const dist = join(process.cwd(), 'dist');
const out = join(process.cwd(), 'public', 'og.png');
const chrome =
	process.env.CHROME_PATH ||
	(process.platform === 'darwin'
		? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
		: join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'));

const MIME = {
	'.html': 'text/html',
	'.css': 'text/css',
	'.js': 'text/javascript',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
	'.png': 'image/png',
	'.mp4': 'video/mp4',
};

const server = createServer((req, res) => {
	let file = join(dist, decodeURIComponent(req.url.split('?')[0]));
	if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
	if (!file.startsWith(dist) || !existsSync(file)) {
		res.writeHead(404);
		return res.end();
	}
	res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
	res.end(readFileSync(file));
});
await new Promise((r) => server.listen(4329, r));

// Card layout: name large on the left, Hung and the rocket moved to the right, site chrome hidden.
const CARD_CSS = `
	.corner-bottom, .picks, .fling-hint, .sun-button, .labels, .back-me, .off-duty, .back-work, .holo-back, .say,
	.clouds, .meadow-birds, .sky-birds, .flyers { display: none !important; }
	.pad, .rocket, .smoke, .hung { translate: 225px 0; }
	/* The location line would sit on the left tree; the description says Vietnam instead. */
	.corner-top .role li:nth-child(3) { display: none; }
	.corner-top {
		top: 88px !important;
		left: 72px !important;
		opacity: 1 !important;
		transform: none !important;
	}
	.corner-top .t-name { font-size: 112px; line-height: 0.95; letter-spacing: -0.01em; }
	.corner-top .role { margin-top: 30px; gap: 14px; font-size: 30px; line-height: 1.2; }
	.corner-top .role li:first-child { font-weight: 700; }
	.og-url {
		position: absolute; z-index: 20; left: 72px; bottom: 64px;
		padding: 12px 26px 14px; border: 3px solid #17130f; border-radius: 999px;
		background: #17130f; color: #f0e9dc;
		font: 700 28px/1 "Shantell Sans", sans-serif;
		box-shadow: 4px 5px 0 #f2a541; rotate: -2deg;
	}
`;

const browser = await chromium.launch({ executablePath: chrome });
const page = await browser.newPage({
	viewport: { width: 1200, height: 630 },
	deviceScaleFactor: 1,
	reducedMotion: 'reduce',
});
await page.goto('http://localhost:4329/', { waitUntil: 'networkidle' });
await page.addStyleTag({ content: CARD_CSS });
await page.evaluate(() => {
	const url = document.createElement('span');
	url.className = 'og-url';
	url.textContent = 'hnng.site';
	document.querySelector('[data-stage]').append(url);
	window.dispatchEvent(new Event('resize'));
});
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(5000);
await page.screenshot({ path: out });
await browser.close();
server.close();
console.log('wrote', out);
