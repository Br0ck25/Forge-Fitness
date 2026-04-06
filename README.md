# Forge Fitness

Forge Fitness is a local-first fitness PWA designed for fast daily use on mobile and desktop. It tracks meals, body weight, and workouts, includes a live barcode scanner for nutrition lookup, and is structured for Cloudflare Pages + Workers deployment.

## What’s inside

- Meal tracking with calorie + macro rollups
- Barcode-driven food lookup powered by a Cloudflare Worker
- Weight logging with trend charts and goal tracking
- Workout logging with reusable templates, session history, and volume stats
- Offline-friendly IndexedDB persistence
- Installable PWA with service worker, manifest, and mobile-safe shell
- JSON backup export/import

## Stack

- React 19 + TypeScript + Vite
- Dexie for IndexedDB persistence
- Recharts for dashboards and trends
- ZXing browser reader for barcode scanning
- Cloudflare Worker for Open Food Facts proxying

## Local development

1. Install dependencies:

   npm install

2. Start the frontend:

   npm run dev

3. Optional: run the barcode worker locally in a second terminal if you want the Cloudflare path instead of the built-in Open Food Facts fallback:

   npm run worker:dev

The app will still attempt a direct Open Food Facts lookup if the Worker is unavailable, so barcode entry remains usable while you’re iterating.

## Cloudflare deployment

### Frontend on Pages

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`

Add `public/_redirects` to preserve SPA routing on Pages — it is already included in this project.

### Barcode API on Workers

Deploy the Worker with:

npm run worker:deploy

Once deployed, you can optionally set `VITE_BARCODE_API_BASE_URL` in Cloudflare Pages to the Worker origin if you want the frontend to call the Worker directly. If you proxy `/api/barcode/*` to the Worker at the edge, the app can keep using the default same-origin path with no environment variable.

## Notes for real-world scanning

- Camera-based barcode scanning requires HTTPS on phones.
- Good lighting matters more than most people would like to admit.
- If a barcode is unknown or missing nutrition, the app lets you review and edit the values before saving.

## Validation

Use these during development:

- `npm run lint`
- `npm run build`
- `npm run check`

## Future-friendly extensions

This v1 is intentionally local-first. If you want multi-device sync later, the clean next step would be adding user auth plus Cloudflare D1 or another hosted database without needing to redesign the UI surface.
