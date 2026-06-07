# Phi Hung Portfolio

Portfolio cá nhân của Phi Hung, Frontend Engineer tập trung vào React, Next.js, TypeScript, Tailwind CSS, Web3 product UI và các giao diện sản phẩm responsive.

Website được xây dựng bằng Astro, dùng Tailwind CSS cho styling và GSAP ScrollTrigger cho hiệu ứng chữ khi cuộn trang.

## Tech Stack

- Astro 5
- Tailwind CSS 4
- GSAP
- TypeScript
- Cloudflare Pages

## Tính Năng

- Trang portfolio một trang với hero, selected work, skill collection, work experience và contact.
- Nội dung dự án và kinh nghiệm được quản lý trực tiếp trong `src/pages/index.astro`.
- Hiệu ứng word reveal sử dụng GSAP và tôn trọng thiết lập `prefers-reduced-motion`.
- Giao diện responsive cho desktop và mobile.
- Cấu hình build sẵn cho Cloudflare Pages qua `wrangler.toml`.

## Cấu Trúc Dự Án

```text
/
├── public/                 Static assets và texture
├── src/
│   ├── layouts/            Layout HTML chung
│   ├── pages/              Astro pages
│   ├── styles/             Global CSS và Tailwind import
│   └── assets/             Assets dùng trong source
├── astro.config.mjs        Cấu hình Astro và Tailwind Vite plugin
├── wrangler.toml           Cấu hình Cloudflare Pages
└── package.json            Scripts và dependencies
```

## Yêu Cầu

- Node.js `>=20`
- npm

## Chạy Local

```sh
npm install
npm run dev
```

Dev server mặc định chạy tại:

```text
http://localhost:4321
```

## Scripts

| Command | Mô tả |
| :-- | :-- |
| `npm run dev` | Chạy dev server |
| `npm run build` | Build production vào thư mục `dist/` |
| `npm run preview` | Preview bản build production |
| `npm run astro` | Chạy Astro CLI |

## Build

```sh
npm run build
```

Kết quả build nằm trong:

```text
dist/
```

## Deploy

Repo đã có `wrangler.toml` với output:

```toml
pages_build_output_dir = "dist"
```

Khi deploy lên Cloudflare Pages, dùng lệnh build:

```sh
npm run build
```

và output directory:

```text
dist
```
