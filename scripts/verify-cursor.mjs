// Verify doodle cursor follows the mouse inside the case sheet dialog.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = new URL('../dist/', import.meta.url).pathname.replace(/^\//, '').replace(/^[A-Za-z]:/, (m) => m[0] + ':');
const distRoot = join(process.cwd(), 'dist');

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };

const server = createServer((req, res) => {
	let p = decodeURIComponent(req.url.split('?')[0]);
	if (p.endsWith('/')) p += 'index.html';
	const file = join(distRoot, p);
	if (existsSync(file) && !file.includes('..')) {
		const final = statSync(file).isDirectory() ? join(file, 'index.html') : file;
		if (existsSync(final)) {
			res.writeHead(200, { 'Content-Type': MIME[extname(final)] || 'application/octet-stream' });
			res.end(readFileSync(final));
			return;
		}
	}
	res.writeHead(404);
	res.end('nope');
});

await new Promise((r) => server.listen(4319, r));

const browser = await chromium.launch({
	executablePath: join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1234', 'chrome-win64', 'chrome.exe'),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4319/', { waitUntil: 'load' });
await page.waitForTimeout(3500); // let intro finish

const readCursor = () =>
	page.evaluate(() => {
		const c = document.querySelector('.cursor');
		const t = c ? getComputedStyle(c).transform : null;
		return {
			inDialog: c ? c.closest('dialog') !== null : false,
			transform: t,
			on: c ? c.classList.contains('is-on') : false,
		};
	});

// 1. cursor on the main stage
await page.mouse.move(700, 400);
await page.waitForTimeout(200);
const before = await readCursor();

// 2. open the case sheet: click the cube, then a planet screen via keyboard flow
await page.evaluate(() => {
	document.querySelector('[data-cube]').click();
});
await page.waitForTimeout(1200); // zoom in
await page.evaluate(() => {
	// focus a planet then open its sheet directly through the pick buttons
	const picks = document.querySelectorAll('[data-pick]');
	picks[0].click();
});
await page.waitForTimeout(900);

const dialogOpen = await page.evaluate(() => document.querySelector('[data-sheet="case"]').open);
const cursorInDialog = await page.evaluate(() => {
	const c = document.querySelector('.cursor');
	return c ? c.closest('dialog') !== null : false;
});

// 3. move the mouse INSIDE the dialog and see if the cursor transform updates
await page.mouse.move(300, 300);
await page.waitForTimeout(150);
const m1 = await readCursor();
await page.mouse.move(900, 600);
await page.waitForTimeout(150);
const m2 = await readCursor();

console.log(JSON.stringify({ before, dialogOpen, cursorInDialog, m1, m2, moved: m1.transform !== m2.transform }, null, 2));

await browser.close();
server.close();
process.exit(m1.transform !== m2.transform && dialogOpen ? 0 : 1);
