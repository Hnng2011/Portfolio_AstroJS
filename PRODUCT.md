# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro 5, Tailwind CSS 4, the Web Animations API for the sheets, SVG posed from script for the character and the rocket, Canvas 2D for the hand-drawn solar system and the ink effects. Deployed to Cloudflare Pages (`wrangler.toml` project `portfolio-hnng`, output `dist`).

## Purpose

Personal portfolio of Phi Hung, a frontend engineer in Vietnam working in React, Next.js and TypeScript, with dashboards, research tooling and Web3 product UI behind him. It exists to get him hired: a visitor should know within seconds who he is, what he has shipped, and how to reach him.

## Audience

Recruiters and hiring managers filling frontend roles (confirmed by the owner, 2026-10-22). They arrive from a CV or LinkedIn link, usually on a laptop, and skim before deciding whether to read a case study or send an email.

## Content

- Seven projects with case studies (challenge, approach, outcome, metrics) in `src/data/portfolio.ts`. Facts there are the owner's; do not add metrics, clients or claims.
- Five roles of work experience, a skills list, and contact links (email, GitHub, LinkedIn).
- Project images: screenshots of the live sites (Formo, Jigger Mixology, NYMUSICKR, UBIW Studio), taken 2026-10-22 at the owner's request, in `public/work/`. Projects without a reachable site (Offer Module, Ubiw, Boxx Circle, Splitting Me) show a rough hand-drawn sketch of their kind of interface, never an invented screenshot.
- UBIW Studio is English only.
- Eight projects, including UBIW Studio (ubiw.space), the team site the owner builds.

## Brand commitments

- Doodle cartoon style, flat 2D (no attempt at 3D), playful. Paper ground, ink lines, marker colours; Shantell Sans.
- Home is one locked screen: a doodle cartoon of the owner (a young adult about 3.3 heads tall, not chibi: whites in his eyes, four-fingered hands, chunky sneakers) with a backpack, on a doodle meadow with butterflies and bees, beside a chunky rocket with "my work" taped to its door. He waves once when you arrive, then breathes, blinks, follows the pointer and now and then glances at the rocket. Clicking him gives a short random line (name, one-line intro, or a nudge to see the work). He does not pace about; the owner found that pointless.
- Scrolling down (or clicking the rocket) is the trip to the work: he walks over, climbs the stairs, ducks in, gives a thumbs-up from the porthole, and the rocket squats, lifts off and climbs with the camera a beat behind into the solar system: one unique planet per project, re-inked by a pen pass as you arrive. The rocket keeps flying in a corner with him at the porthole. Scrolling back up (or clicking the rocket, or "Fly home") stands it on its tail and lands it on a slowing burn; he climbs out and walks back to his spot. A second scroll or click hurries a trip along. Planets can be grabbed and flung; they spring back to their orbits. Clicking a planet throws ink to preview it; clicking the preview floods the screen and the preview flies into the full case.
- Past the work is the off-duty moon. Scrolling on from the solar system (or "Off duty", or swiping up) flies the rocket sideways to a small cratered moon with the Earth in its sky, where it lands beside his base (a dome with a solar panel and an antenna). He never sets foot outside, which the owner found absurd: a docking tube runs out to the rocket, the camera pushes in through the dome's window, and he walks into his room from the airlock. The room holds his hobbies, from the owner's own list in `src/data/portfolio.ts` (`hobbies`): a travel map and a suitcase, a beach photo and a surfboard, a gaming monitor, desk gear (mechanical keyboard, mouse, deskmat) and a laptop for creative coding. Pointing at a thing tags it; clicking it makes him walk over (to a spot where he hides nothing), it plays, and he talks about that hobby. Scrolling back up (or "Back to work") walks him out through the airlock and flies back to the work.
- Motion is cartoon with weight: drawn views swap on turns with the head leading, steps roll heel to toe with knees bending (the limbs are worked out by IK in `src/lib/hung.ts`), the rocket squashes and stretches, the smoke billows. Lines boil like hand inking.
- A case is a scrapbook spread on the planet's colour and pattern, fitting one desktop screen: a taped photo or screen recording with handwritten notes and arrows, the approach as three sticky notes, the problem on a taped scrap and the outcome on an index card. Earlier, shut-down projects live in an Archive.
- Info and Contact are separate pages in the same style, reached through a two-pour ink transition. Info shows the owner waving in the middle with about and experience on either side.
- Title: Creative Frontend Engineer. English only.
