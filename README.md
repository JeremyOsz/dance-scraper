# Dance Scraper London Calendar

Next.js + Tailwind + shadcn-style UI app that aggregates adult/open dance and movement classes from selected London venues into a week/month calendar.

## Included Venues (v1)

- The Place
- Rambert
- Siobhan Davies Studios
- TripSpace
- Chisenhale Dance Space
- CI Calendar London (Contact Improvisation)
- Bachata Community (Bachata/Salsa events)
- Ecstatic Dance London (selected Eventbrite organizers)
- Five Rhythms London

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

## API Routes

- `GET /api/classes?from=YYYY-MM-DD&to=YYYY-MM-DD&venue=TripSpace&day=Monday&q=improvisation&workshopsOnly=true`
- `GET /api/venues`

## Local Development

```bash
npm install
npm run scrape
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run scrape` scrape + normalize all six venues
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

Prioritized extension venues live in:

- `data/extension-targets.json`
