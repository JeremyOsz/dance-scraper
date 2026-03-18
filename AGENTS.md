## Learned User Preferences
- Prefer “professional” tone for homepage/product copy when offering options.
- Keep contact/feedback reachable but lightweight; configure destinations via env vars rather than hardcoding.
- Prefer moving/placing CTAs intentionally (e.g., reuse the old “suggest a venue” slot; show contact CTA at the bottom of other views).
- Prefer clear, user-facing status labels (e.g., “Error scraping” instead of softer wording).
- For calendar UX: desktop should highlight today but show Monday–Friday; mobile should start from today.
- When renaming venues/labels, update all user-facing instances consistently (UI + data + tests), without changing stable keys/URLs.

## Learned Workspace Facts
- This is a Next.js App Router project deployed on Vercel.
- Contact flow is implemented as an App Router route (`app/api/contact/route.ts`) and should be driven by environment variables (e.g. `CONTACT_EMAIL`, provider keys).
- Scrapers live under `scripts/scrape/adapters/` and commonly use `axios` + `cheerio` helpers (`fetchHtml`, `fetchJson`).
- Some venues embed schedules via iframes/JS widgets; scraping may require finding stable JSON endpoints rather than parsing the initial HTML shell.
- The project uses `next-pwa` (Workbox) and a service worker under `public/sw.js`.
- Typed routes are in play in the UI; dynamic URLs may require `Route`-typed assertions when calling `router.replace`.
