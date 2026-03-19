## Learned User Preferences
- Prefer “professional” tone for homepage/product copy when offering options.
- Keep contact/feedback reachable but lightweight; configure destinations via env vars rather than hardcoding.
- Prefer moving/placing CTAs intentionally (e.g., reuse the old “suggest a venue” slot; show contact CTA at the bottom of other views).
- Prefer clear, user-facing status labels (e.g., “Error scraping” instead of softer wording).
- For calendar UX: desktop should highlight today but show Monday–Friday; mobile should start from today.
- When renaming venues/labels, update all user-facing instances consistently (UI + data + tests), without changing stable keys/URLs; use “Butoh Mutations” (plural), never “Butoh Mutation,” in copy.
- Public product name is “London Dance Calendar” (not “London Dance Scraper” or “Dance Scraper London”) in metadata, manifest, share strings, and similar surfaces.

## Learned Workspace Facts
- This is a Next.js App Router project deployed on Vercel.
- Contact flow is implemented as an App Router route (`app/api/contact/route.ts`) and should be driven by environment variables (e.g. `CONTACT_EMAIL`, provider keys).
- Scrapers live under `scripts/scrape/adapters/` and commonly use `axios` + `cheerio` helpers (`fetchHtml`, `fetchJson`).
- Some venues embed schedules via iframes/JS widgets; scraping may require finding stable JSON endpoints rather than parsing the initial HTML shell.
- The project uses `next-pwa` (Workbox) and a service worker under `public/sw.js`.
- Typed routes are in play in the UI; dynamic URLs may require `Route`-typed assertions when calling `router.replace`.
- Curated manual listings live in `data/custom-events.json` and are ingested via the `customEvents` scrape adapter; the file’s top-level `venue` string must match each event row’s `venue` so merge/replace-by-venue stays correct.
- The Place adapter prefers per-course HTML session dates (one row per bookable date); if none are found, it falls back to weekly rows with Camden term closure ranges from `the-place-term-exclusions.ts`.
- Run `npm run scrape` for all venues or `npm run scrape -- --force <venueKey>` (e.g. `thePlace`, `customEvents`) to refresh `data/classes.normalized.json`.
- Vercel Web Analytics must be enabled for the project in the Vercel dashboard (then redeployed) before `@vercel/analytics` collects data in production.
