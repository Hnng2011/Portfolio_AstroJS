# Phi Hung Portfolio

Portfolio cá nhân của Phi Hung, Frontend Engineer tập trung vào React, Next.js, TypeScript, Tailwind CSS, Web3 product UI và các giao diện sản phẩm responsive.

Website là một màn hình duy nhất (không cuộn trang) theo phong cách Doodle, vẽ mực tay trên giấy: một hệ mặt trời, mỗi project là một hành tinh vẽ tay riêng. Cuộn hoặc kéo để xoay hệ, bấm hành tinh để đưa nó ra trước và "ném mực" mở khung xem trước, bấm khung để đọc case study.

## Tech Stack

- Astro 5
- Tailwind CSS 4
- GSAP (sheet và intro)
- Canvas 2D (hệ mặt trời vẽ tay, vệt mực văng, hiệu ứng đổ mực chuyển trang)
- Cloudflare Pages

## Cấu Trúc Dự Án

```text
/
├── src/
│   ├── components/         Stage (màn hình chính), Me / MeWave / FrontHead (nhân vật), Meadow (bãi cỏ, bướm ong),
│   │                       Sheets (case study), Sketch (hình sơ project), SiteNav, Cursor, DoodleIcon
│   ├── data/portfolio.ts   Nội dung: project, kinh nghiệm, kỹ năng, liên hệ
│   ├── lib/                solar (hệ mặt trời), splat (mực văng), ink (đổ mực chuyển trang), flyers (bướm ong), cursor
│   ├── scripts/            app.ts (trang chủ: đi bộ, zoom, hệ mặt trời, FPS), page.ts (info, contact)
│   ├── pages/              index (màn hình chính), info, contact
│   └── styles/global.css   Design tokens (Tailwind v4 @theme)
├── PRODUCT.md              Định vị sản phẩm
└── wrangler.toml           Cấu hình Cloudflare Pages
```

## Tinh chỉnh hiệu ứng

- `TUNING` đầu file `src/lib/solar.ts`: màu, độ rung nét vẽ tay (line boil), khoảng cách nét tô bóng, tốc độ quay, góc nghiêng camera.
- `SPLAT` đầu file `src/lib/splat.ts`: màu mực, thời gian ném và văng, số tia và giọt mực.
- Hình dáng từng hành tinh: mảng `LOOKS` trong `solar.ts` (một dòng cho mỗi project, theo thứ tự trong `portfolio.ts`).

## Thêm ảnh cho project

Mỗi project trong `src/data/portfolio.ts` có trường `image` (tuỳ chọn). Đặt ảnh vào `public/work/` rồi khai báo, ví dụ `image: '/work/formo.jpg'`. Ảnh tỉ lệ 16:10 đẹp nhất; khi chưa có ảnh thì khung hiện hình sơ vẽ tay.

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
