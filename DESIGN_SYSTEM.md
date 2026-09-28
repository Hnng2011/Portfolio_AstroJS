# Design System — "Frosted Swiss" (Glassmorphism × Swiss Design)

Spec dùng chung cho mọi module. Đọc `src/styles/global.css` để thấy token gốc (Tailwind v4 `@theme`).
KHÔNG tự định nghĩa màu/blur/easing mới — chỉ dùng token có sẵn.

## 1. Dual-tone section rule

| Tone | Nền | Chữ | Section dùng |
|------|-----|-----|--------------|
| `tone-dark` | `#0a0c12` + mesh gradient (signal blue / accent red / mint) + grid 88px | `frost` | Hero, Nav, Playground, Experience, Footer |
| `tone-light` | `#f6f5f1` paper + grid 88px | `ink` | Projects, Skills |

Wrapper bắt buộc: `<section class="tone-dark">` hoặc `tone-light`, content bên trong dùng `.swiss-container`.

## 2. Glass recipes (chỉ dùng utility có sẵn)

- Dark section → `glass-dark glass-edge rounded-glass` (panel kính trắng 3.5–10%, blur 24px, viền gradient 1px qua `.glass-edge`).
- Light section → `glass-light glass-edge rounded-glass` (kính trắng 45–75%, blur 20px).
- Hover vật lý: thêm `glass-hover hover:-translate-y-1.5 hover:shadow-lift` — spring qua `--ease-spring`.
- Opacity lớp kính luôn trong khoảng 15–40% cảm nhận thị giác; KHÔNG stack quá 3 lớp blur lồng nhau (perf).
- Depth layer: phần tử nền sau (mesh, grid) không blur; panel giữa blur 24px; text sắc nét không blur.

## 3. Swiss grid & typography

- Container: `.swiss-container` (max 1520px). Grid 12 cột `lg:grid-cols-12`, gutter `gap-4 lg:gap-6`.
- Bất đối xứng có trật tự: dùng `lg:col-span-*` / `lg:col-start-*` lệch, không căn giữa mặc định.
- Mỗi section mở đầu bằng: số thứ tự mono (`01 —`) + `t-label` + tiêu đề `t-headline` hoặc `t-display`.
- `t-display`: clamp 3.2–8.5rem, weight 900, uppercase. `t-expanded` khi cần kiểu Helvetica Expanded.
- Nhấn mạnh: gạch chân hairline, khối accent `bg-accent text-white` nhỏ, KHÔNG tô gradient chữ.
- Accent `#e8380d` dùng < 5% diện tích mỗi section (dot, số index, CTA, underline).

## 4. Motion spec (GSAP 3.15 — mọi plugin đều free)

- Easing chuẩn: `expo.out`, `power4.out` cho reveal; `back.out(1.7)` cho pop; `elastic.out(1, 0.6)` cho spring kính.
- Reveal khi scroll: `ScrollTrigger { start: 'top 85%', once: true }`, stagger 0.03–0.06.
- Page load hero: staggered reveal tổng < 1.6s.
- Hover glass: tilt theo con trỏ tối đa ±6deg, `transformPerspective: 800`, specular highlight di chuyển.
- BẮT BUỘC: `const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;` → bỏ qua animation, `gsap.set(..., { clearProps: 'all', opacity: 1 })`.
- Chỉ animate `transform` / `opacity` / `filter`. Không animate `box-shadow`, `backdrop-filter` bằng JS.
- Script đặt trong `<script>` của chính component (Astro tự bundle, defer). Import: `import gsap from 'gsap'; import { ScrollTrigger } from 'gsap/ScrollTrigger';` và `gsap.registerPlugin(ScrollTrigger)` một lần.
- Helper có sẵn trong global.css: `.word-clip` / `.word-core` cho text reveal; attribute convention `data-word-reveal`.

## 5. Quy tắc code

- Astro component (.astro), KHÔNG dùng framework JS (không React/Vue), không `client:*` directive.
- Tailwind v4 utility-first; custom utilities khả dụng: `glass-dark`, `glass-light`, `glass-edge`, `glass-hover`, `swiss-container`, `t-display`, `t-headline`, `t-label`, `t-expanded`, `vertical-label`, `stroke-title`, `marquee-track`.
- KHÔNG thêm comment vào code. KHÔNG sửa file ngoài phạm vi được giao (global.css, Layout.astro, index.astro, data/portfolio.ts là READ-ONLY với agent con).
- Data import từ `../data/portfolio.ts` (đúng relative path theo vị trí file).
- Ảnh portrait: `import portrait from '../assets/portrait.svg';` (từ src/components). Thumbnails tác phẩm: `../assets/work-01.svg` → `work-07.svg`.
- Accessibility: contrast chữ ≥ 4.5:1 trên nền kính, `aria-label` cho icon-only button, focus-visible ring `focus-visible:ring-2 focus-visible:ring-accent`.
