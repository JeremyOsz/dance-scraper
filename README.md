# Dance Scraper London Calendar

London Dance Calendar is a compiled calendar of adult dance and movement workshops across London.

This is a hobby project maintained by a single developer, so please understand there may be errors and inaccuracies.

## Included Organisers (v1)

- The Place
- Rambert
- Siobhan Davies Studios
- TripSpace
- Chisenhale Dance Space
- CI Calendar London (Contact Improvisation)
- Bachata Community (Bachata/Salsa events)
- Ecstatic Dance London (selected Eventbrite organisers)
- Five Rhythms London
- SuperMario Salsa
- Salsa Rueda (Rueda Libre)
- Cubaneando
- Butoh Mutations
- Posthuman Theatre Butoh
- Hackney Baths
- Wednesday Moving
- Danceworks
- Pineapple Dance Studios
- BASE Dance Studios
- Salsa! Soho
- Bar Salsa Temple
- MamboCity
- City Academy
- StreamMovement
- Marina Sfyridi
- Look At Movement (Tanztheatre)
- The Manor / MVMT
- East London Dance
- Con Tumbao Salsa
- Under the Sun Dance
- Ballet for You
- Rachel Mann & Marlon Who Henry
- Custom listings (manual entries in `data/custom-events.json`)

## Organisers To Be Added

- Baila London
- Salsateca
- Morley College Dance
- English National Ballet - Move With Us
- Greenwich Dance
- Studio 808

## Stack

- Next.js (App Router)
- Tailwind CSS
- shadcn-style component setup (`components.json`)
- Axios + Cheerio scrapers
- Vitest + Testing Library + Playwright

## Data Contract

Canonical session type:

`DanceSession = { id, venue, title, details, dayOfWeek, startTime, endTime, startDate, endDate, timezone, bookingUrl, sourceUrl, tags, audience, isWorkshop, lastSeenAt }`

Canonical output file:

- `data/classes.normalized.json`

Curated one-off or hard-to-scrape series:

- `data/custom-events.json` — add objects under `events`; use the same `venue` string for every row in that file so incremental scrapes replace prior sessions correctly (see `scripts/scrape/adapters/custom-events.ts`).

## API Routes

- `GET /api/classes?from=YYYY-MM-DD&to=YYYY-MM-DD&type=Contact%20Improv&venue=TripSpace&day=Monday&q=improvisation&workshopsOnly=true`
- `GET /api/venues`

## Local Development

```bash
npm install
npm run scrape
npm run dev
```

Open `http://localhost:3000`.

## PostHog analytics

Set `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` in `.env.local`
using the project token and client API host from your PostHog project settings.
Use `https://eu.i.posthog.com` for EU Cloud or `https://us.i.posthog.com` for US Cloud.
These are public browser configuration values. Do not use a personal API key.

For Vercel, set both variables for the deployment environments you want to track,
then redeploy. Next.js embeds these values at build time. Leave either value blank
to disable PostHog, including during local development.

The integration captures page views, automatic interactions, and deliberate app
usage events for discovery, class details, shortlist saves, shares, calendar export
clicks, and outbound booking clicks. Feedback delivery outcomes are captured on
the server with the browser's anonymous identity. Session recording is disabled.
Existing Vercel Analytics remains enabled. See [the event definitions](docs/analytics.md).

To verify delivery after configuring the variables, visit the calendar, navigate
to another page, and click a booking link. Check PostHog's live events for
`$pageview` and `outbound_click`.

See the [PostHog Next.js documentation](https://posthog.com/docs/libraries/next-js).

## Scripts

- `npm run scrape` scrape + normalize all configured organisers
- `npm run scrape -- --empty` scrape only venues that were previously successfully scraped with zero classes
- `npm run scrape -- --outdated` scrape only venues whose last valid scrape is older than 24 hours (or missing)
- `npm run scrape -- --force rambert,thePlace` force specific venues by key or name
- `npm run scrape -- --outdated --force rambert` combine filters with forced venue overrides
- `npm run dev` run Next.js dev server
- `npm run build` production build
- `npm test` run unit/integration/UI tests
- `npm run test:e2e` run Playwright E2E tests

## Scheduling

Daily scrape workflow:

- `.github/workflows/daily-scrape.yml`

It runs once daily, updates `data/classes.normalized.json`, and commits changes when data differs.

## Tests Included

- Adapter parser unit tests with HTML fixtures (including malformed fixture)
- Normalization contract/dedupe test
- Filter integration test
- UI test for week/month toggle + detail panel
- Playwright smoke test for calendar page

## Extension Targets

Prioritized extension organisers live in:

- `data/extension-targets.json`

## Feature Backlog

In progress:

- Filter by preferred organisers
- Save shortlist

Next:

- Custom event (private)
- Log in with Google
- Share to Google Calendar
- Custom eventbrite organiser 
