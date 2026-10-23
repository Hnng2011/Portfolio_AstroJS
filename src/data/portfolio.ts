export interface CaseStudy {
	challenge: string;
	approach: string[];
	outcome: string;
	metrics: { label: string; value: string }[];
}

export interface Project {
	index: string;
	title: string;
	type: string;
	year: string;
	summary: string;
	tags: string[];
	url?: string;
	image?: string;
	diagram?: boolean;
	status?: string;
	caseStudy: CaseStudy;
}

export const profile = {
	name: 'Phi Hung',
	role: 'Creative Frontend Engineer',
	focus: 'Product UI for Dashboards & DApps',
	location: 'Vietnam',
	stack: 'React / Next.js / TypeScript',
	tagline:
		'Frontend engineer shipping production UI for dashboards, research platforms, and Web3 products. Three years in, focused on reusable components, responsive layouts, and flows that hold up under real data.',
	education: 'Bachelor of Information Technology, Ho Chi Minh University of Science',
	language: 'English working proficiency',
};

export const projects: Project[] = [
	{
		index: '01',
		title: 'UBIW Studio',
		type: 'Frontend Engineer / Team site',
		year: 'Sep 2026 - Present',
		summary:
			'The site of UBIW Studio, a product team of seven friends from HCMUS. I built it end to end: a Next.js site with an interactive WebGL room where each member is introduced through their desk, machines and photos.',
		tags: ['Next.js', 'WebGL'],
		url: 'https://ubiw.space/',
		image: '/work/ubiw-studio.webp',
		status: 'Live Project',
		caseStudy: {
			challenge:
				'Introduce a seven-person product team through its work rather than a sales pitch, and keep it smooth on desktop and phones.',
			approach: [
				'Built a statically exported Next.js 16 site on Cloudflare with share images generated at build time',
				'Wrote an interactive WebGL room in which desks, machines and photos introduce each member',
				'Animated only transform and opacity, with Lenis scrolling and loops paused off-screen, to hold 60 fps',
			],
			outcome:
				'Live at ubiw.space, scoring 100 for accessibility and 100 for best practices in Lighthouse, with zero layout shift (Oct 2026).',
			metrics: [
				{ label: 'Stack', value: 'Next.js 16 + WebGL' },
				{ label: 'Hosting', value: 'Cloudflare' },
				{ label: 'Link', value: 'ubiw.space' },
			],
		},
	},
	{
		index: '02',
		title: 'Offer Module',
		type: 'Frontend Engineer / TGM Research',
		year: 'Jul 2025 - Present',
		summary:
			'An internal operations module and an external client portal for a market research company. I build pricing modules and multi-role features, refactor legacy code, and guard every release with unit and end-to-end tests.',
		tags: ['React', 'Turborepo', 'Playwright'],
		status: 'Live Project',
		diagram: true,
		caseStudy: {
			challenge:
				'Legacy pricing screens re-rendered heavy market data in loops, form rules were fragile, and clients needed a portal of their own next to the internal tool.',
			approach: [
				'Built pricing modules and dynamic multi-value forms on React Hook Form + Zod, so business rules are enforced by typed schemas',
				'Moved Redux data setup out of the UI layer and cached derived data with useRef and useMemo, which ended the render loops',
				'Built the client portal from scratch with Vite, Tailwind and shadcn/ui inside the Turborepo monorepo, kept current by polling with TanStack Query',
			],
			outcome:
				'Every pull request now runs lint, type-check, unit tests with coverage gates, the build and Playwright end-to-end tests in parallel on Bitbucket, with a weekly full end-to-end run and dependency audit.',
			metrics: [
				{ label: 'Commits', value: '400+, AI-assisted' },
				{ label: 'Tests', value: 'Vitest + Playwright' },
				{ label: 'Repo', value: 'Turborepo' },
			],
		},
	},
	{
		index: '03',
		title: 'Formo',
		type: 'Full-stack Developer / Web3 analytics',
		year: 'Feb 2025 - Jun 2025',
		summary:
			'A Web3 platform for token-gated forms and surveys with real-time analytics dashboards. I built the product on Next.js and Supabase, its event pipelines, a shared Radix + Tailwind component system, payments and token gating.',
		tags: ['Next.js', 'Supabase', 'Tinybird'],
		url: 'https://formo.so/',
		image: '/work/formo.webp',
		caseStudy: {
			challenge:
				'One product had to serve both ordinary forms and token-gated Web3 campaigns, with analytics that update as events arrive.',
			approach: [
				'Built Tinybird pipelines that ingest and filter events from the Formo SDK, and pushed live dashboard updates through Supabase Realtime',
				'Designed one Radix UI + Tailwind component system used across every product surface',
				'Wrote a Supabase Edge Function for Paddle payment webhooks, and token gating with the Moralis and Helius APIs',
			],
			outcome:
				'Events flow from the SDK through Tinybird into dashboards that update live, while payments and wallet-based gates run inside the same Supabase backend.',
			metrics: [
				{ label: 'Role', value: 'Full-stack' },
				{ label: 'Data', value: 'Tinybird + Supabase' },
				{ label: 'Link', value: 'formo.so' },
			],
		},
	},
	{
		index: '04',
		title: 'Jigger Mixology',
		type: 'F&B consulting website',
		year: 'Independent project',
		summary:
			'The website of an F&B consulting business. I structured the offer, built the responsive Astro site, and shaped the catalogue and project pages so consulting, training and cafe setup each read at a glance.',
		tags: ['Astro', 'Responsive UI'],
		url: 'https://jiggermixology.com/',
		image: '/work/jigger-mixology.webp',
		caseStudy: {
			challenge:
				'An F&B consultancy needed a fast website that makes consulting, training and cafe-setup services clear within seconds.',
			approach: [
				'Organised the site around the three service lines',
				'Built a responsive Astro site with a catalogue and a project showcase',
				'Kept pages light for visitors arriving on phones',
			],
			outcome:
				'Live at jiggermixology.com, scoring 96 for accessibility, 100 for best practices and 92 for SEO in Lighthouse, with almost no layout shift (CLS 0.009 on mobile, Oct 2026).',
			metrics: [
				{ label: 'Stack', value: 'Astro' },
				{ label: 'Type', value: 'Independent' },
				{ label: 'Link', value: 'jiggermixology.com' },
			],
		},
	},
	{
		index: '05',
		title: 'NYMUSICKR',
		type: 'Frontend Engineer / Burning Bros',
		year: 'Aug 2024 - Feb 2025',
		summary:
			'A high-traffic web app for selling albums, running fan clubs and organising events. I built server-rendered Remix UI, localization for each market, production hotfixes, and the move off the legacy codebase.',
		tags: ['Remix', 'SSR'],
		url: 'https://nymusickr.com/',
		image: '/work/nymusickr.webp',
		caseStudy: {
			challenge:
				'A music store had to load fast and rank well in search while it was translated for new markets and moved off a legacy codebase.',
			approach: [
				'Rendered album, fan-club and event pages on the server with Remix',
				'Built accessible UI on Headless UI primitives and added localization for each market release',
				'Migrated legacy screens to React + TypeScript and shipped production hotfixes on a Jira and Slack cadence',
			],
			outcome:
				'Pages arrive server-rendered for fast first loads and search visibility, translated per market, on a React + TypeScript codebase in place of the legacy one.',
			metrics: [
				{ label: 'Stack', value: 'Remix SSR' },
				{ label: 'Team', value: 'Burning Bros' },
				{ label: 'Link', value: 'nymusickr.com' },
			],
		},
	},
];

export interface ArchiveProject {
	title: string;
	type: string;
	year: string;
	summary: string;
	tags: string[];
}

// Earlier work whose products have shut down: listed for the record, kept off the main solar system.
export const archive: ArchiveProject[] = [
	{
		title: 'Ubiw',
		type: 'Frontend Engineer / Web3 DApp',
		year: 'Jan 2024 - Jul 2024',
		summary:
			'A content-sharing DApp meant to feel like a Web2 app. I prototyped account abstraction and social login with Particle, ZK Email verification, Matrix messaging and embedded wallets.',
		tags: ['Particle', 'Matrix', 'Account abstraction'],
	},
	{
		title: 'Boxx Circle',
		type: 'Frontend Engineer / Private product',
		year: 'Sep 2023 - Feb 2024',
		summary:
			'A recycling-box service with a buyer app, restaurant workflows and admin tooling. I built shared React + MUI components, shipped Capacitor mobile builds and kept Storybook current.',
		tags: ['React', 'MUI', 'Storybook'],
	},
	{
		title: 'Splitting Me',
		type: 'Frontend Engineer / Outsource',
		year: 'Aug 2023 - Sep 2023',
		summary:
			'A one-month outsource job turning React templates into an NFT, token and real-estate marketplace, with Wagmi wallet login, IPFS uploads and NFT minting.',
		tags: ['React', 'Wagmi', 'IPFS'],
	},
];

export const experiences = [
	{
		role: 'Frontend Developer',
		company: 'TGM Research',
		period: 'Jul 2025 - Present',
		detail:
			'Refactor legacy modules, ship product features, resolve production issues, and optimize rendering paths for research operations tooling.',
	},
	{
		role: 'Frontend Engineer',
		company: 'Ubiwdotspace - Outsource team',
		period: 'Apr 2024 - Present',
		detail:
			'Run outsource projects end to end: requirement breakdown, UI direction, implementation, flow testing, deployment, and release support.',
	},
	{
		role: 'Software Engineer',
		company: 'Formo',
		period: 'Feb 2025 - Jun 2025',
		detail:
			'Build full-stack features for a Web3 analytics platform — reusable UI, Supabase schemas, real-time pipelines, payments, and access control.',
	},
	{
		role: 'Software Engineer',
		company: 'Burning Bros',
		period: 'Aug 2024 - Feb 2025',
		detail:
			'Implement localization, responsive UI, and production fixes; support legacy migration alongside UX/UI and product teams.',
	},
	{
		role: 'Frontend Developer',
		company: 'AZ Solution',
		period: 'Sep 2023 - Feb 2024',
		detail:
			'Create reusable React components, improve responsive UI, support localization, join code reviews, and handle testing and deployment.',
	},
];

export const skills = {
	primary: ['React', 'TypeScript'],
	secondary: ['Web3', 'Next.js Apps', 'Tailwind CSS', 'Forms + Zod', 'Supabase'],
	tertiary: ['MUI + Radix', 'Zustand', 'Redux', 'Playwright', 'Wagmi', 'Vitest'],
	statement: 'Reusable Interfaces',
	marquee: 'React / Next.js / TypeScript / TailwindCSS / Zod / GSAP / Supabase / Web3 / Testing /',
};

export const contactLinks = [
	{ label: 'GitHub', url: 'https://github.com/Hnng2011' },
	{ label: 'LinkedIn', url: 'https://www.linkedin.com/in/lu-h%C3%B9ng-081320214' },
	{ label: 'Email', url: 'mailto:luphihung111@gmail.com' },
];
