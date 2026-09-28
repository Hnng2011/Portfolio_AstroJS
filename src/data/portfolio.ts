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
	status?: string;
	caseStudy: CaseStudy;
}

export const profile = {
	name: 'Phi Hung',
	role: 'Frontend Engineer',
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
		title: 'Offer Module',
		type: 'Frontend Engineer / TGM Research',
		year: 'Jul 2025 - Present',
		summary:
			'Internal pricing and market-configuration tooling for research operations. I ship features, stabilize legacy modules, speed up data-heavy rendering, and guard releases with Vitest and Playwright.',
		tags: ['React', 'Turborepo', 'Testing'],
		status: 'Live Project',
		caseStudy: {
			challenge:
				'Legacy pricing modules rendered heavy market data slowly. Form logic grew fragile with every release.',
			approach: [
				'Rebuilt dynamic forms on React Hook Form + Zod for schema-safe validation',
				'Optimized rendering paths for data-heavy screens across the Turborepo monorepo',
				'Added Vitest unit coverage and Playwright smoke tests before every release',
			],
			outcome:
				'Steady feature delivery on live research tooling. Fewer regressions, faster configuration workflows.',
			metrics: [
				{ label: 'Status', value: 'Live' },
				{ label: 'Testing', value: 'Vitest + Playwright' },
				{ label: 'Repo', value: 'Turborepo' },
			],
		},
	},
	{
		index: '02',
		title: 'Formo',
		type: 'Full-stack Developer / Web3 analytics',
		year: 'Feb 2025 - Jun 2025',
		summary:
			'Web3 analytics and form-building platform tracking growth, user behavior, and token-gated engagement. I built the product UI, a Tailwind + Radix component layer, Supabase data flows, and Paddle access control.',
		tags: ['Next.js', 'Supabase', 'Tinybird'],
		url: 'https://formo.so/',
		caseStudy: {
			challenge:
				'The product needed one reusable UI layer and real-time pipelines serving both Web2 forms and token-gated Web3 campaigns.',
			approach: [
				'Designed a Tailwind + Radix component library shared across every product surface',
				'Modeled Supabase schemas and real-time flows for analytics ingestion',
				'Wired Paddle access control and support automation end to end',
			],
			outcome:
				'Full-stack features shipped to production, tracking growth and behavior for live Web3 campaigns.',
			metrics: [
				{ label: 'Role', value: 'Full-stack' },
				{ label: 'Data', value: 'Tinybird + Supabase' },
				{ label: 'Link', value: 'formo.so' },
			],
		},
	},
	{
		index: '03',
		title: 'Jigger Mixology',
		type: 'F&B consulting website',
		year: 'Independent project',
		summary:
			'Live service website for an F&B consulting business. I structured the offer, built the responsive Astro interface, and shaped catalogue and project pages so consulting, training, and cafe setup read instantly.',
		tags: ['Astro', 'Responsive UI', 'Service UX'],
		url: 'https://jiggermixology.com/',
		caseStudy: {
			challenge:
				'An F&B consultancy needed a fast website that made consulting, training, and cafe-setup services legible in seconds.',
			approach: [
				'Structured the information architecture around three core service lines',
				'Built a responsive Astro interface with catalogue and project showcase',
				'Tuned page weight for speed on mobile-first traffic',
			],
			outcome: 'A live marketing site turning visitors into service inquiries.',
			metrics: [
				{ label: 'Stack', value: 'Astro' },
				{ label: 'Type', value: 'Independent' },
				{ label: 'Link', value: 'jiggermixology.com' },
			],
		},
	},
	{
		index: '04',
		title: 'NYMUSICKR',
		type: 'Frontend Engineer / Burning Bros',
		year: 'Aug 2024 - Feb 2025',
		summary:
			'Music commerce web app for albums, fan clubs, and events. I delivered SSR-focused Remix UI, localization for multi-market releases, production hotfixes, and legacy migration support.',
		tags: ['Remix', 'SSR', 'Headless UI'],
		url: 'https://nymusickr.com/',
		caseStudy: {
			challenge:
				'A music commerce app had to stay fast under SSR while absorbing localization and a legacy migration.',
			approach: [
				'Delivered SSR-focused frontend work in Remix with Headless UI primitives',
				'Implemented localization flows for multi-market releases',
				'Shipped production hotfixes and legacy migration support on a Jira/Slack cadence',
			],
			outcome: 'Responsive commerce UI shipped reliably across every release cycle.',
			metrics: [
				{ label: 'Stack', value: 'Remix SSR' },
				{ label: 'Team', value: 'Burning Bros' },
				{ label: 'Link', value: 'nymusickr.com' },
			],
		},
	},
	{
		index: '05',
		title: 'Ubiw',
		type: 'Frontend Engineer / Web3 DApp',
		year: 'Jan 2024 - Jul 2024',
		summary:
			'Content-sharing DApp built to make Web3 feel like Web2. I explored account abstraction, social login, ZK Email verification, Matrix messaging, and embedded wallets — from prototype to product UI.',
		tags: ['DApp', 'Particle', 'Matrix'],
		status: 'Project Shutdown',
		caseStudy: {
			challenge:
				'Make a content-sharing DApp feel like a Web2 app: no seed phrases, no friction, verifiable identities.',
			approach: [
				'Explored account abstraction and social login through Particle',
				'Prototyped ZK Email verification and Matrix-based messaging flows',
				'Embedded wallets and refined blockchain interaction UX',
			],
			outcome: 'R&D frontend that validated Web3 onboarding patterns for Web2 users.',
			metrics: [
				{ label: 'Focus', value: 'Account Abstraction' },
				{ label: 'Auth', value: 'ZK Email' },
				{ label: 'Status', value: 'Shutdown' },
			],
		},
	},
	{
		index: '06',
		title: 'Boxx Circle',
		type: 'Frontend Engineer / Private product',
		year: 'Sep 2023 - Feb 2024',
		summary:
			'Recycling-box ecosystem spanning food-buyer apps, restaurant workflows, and admin tooling. I built reusable React + MUI components, packaged shared UI modules, shipped Capacitor mobile builds, and kept Storybook current.',
		tags: ['React', 'MUI', 'Storybook'],
		status: 'Project Shutdown',
		caseStudy: {
			challenge:
				'One ecosystem, three product surfaces — buyer apps, restaurant workflows, admin tooling — each needing consistent UI across web and mobile.',
			approach: [
				'Built reusable React + MUI components packaged as shared UI modules',
				'Shipped Capacitor mobile builds with fully responsive screens',
				'Maintained Storybook previews and Supabase data integration',
			],
			outcome: 'A shared component system keeping three product surfaces visually consistent.',
			metrics: [
				{ label: 'Surfaces', value: '3 apps' },
				{ label: 'Mobile', value: 'Capacitor' },
				{ label: 'Docs', value: 'Storybook' },
			],
		},
	},
	{
		index: '07',
		title: 'Splitting Me',
		type: 'Frontend Engineer / Outsource',
		year: 'Aug 2023 - Sep 2023',
		summary:
			'Web3 marketplace flow for NFT, token, and real-estate listings. I adapted React templates into new pages, connected REST APIs, implemented Wagmi wallet login, IPFS media uploads, and NFT minting.',
		tags: ['React', 'Wagmi', 'IPFS'],
		status: 'Project Shutdown',
		caseStudy: {
			challenge:
				'A one-month outsource cycle to turn existing React templates into a working NFT, token, and real-estate marketplace.',
			approach: [
				'Adapted templates into new marketplace pages wired to REST APIs',
				'Implemented Wagmi wallet login and IPFS media uploads',
				'Supported NFT minting flows end to end',
			],
			outcome: 'Marketplace MVP delivered inside a one-month outsource cycle.',
			metrics: [
				{ label: 'Cycle', value: '1 month' },
				{ label: 'Auth', value: 'Wagmi wallet' },
				{ label: 'Media', value: 'IPFS' },
			],
		},
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

export const navLinks = [
	{ label: 'Work', href: '#work' },
	{ label: 'Stack', href: '#stack' },
	{ label: 'Path', href: '#path' },
	{ label: 'Contact', href: '#contact' },
];
