# London Dance Calendar: summer 2026 data and growth audit

Checked 11 July 2026. Audit window: 11 July–30 September 2026.

## Executive verdict

Production was generated at `2026-07-11T07:25:39Z` and contains 1,090 dated sessions in the audit window across 17 venue labels. Most sources that the current adapters can reach agree with production, but the calendar should not be treated as fully reliable until three priority problems are addressed:

1. **The Place is stale and missing its September term.** Production reports a failed scrape, last successful on 3 June, and retains 257 older records. The first-party page now publishes the Autumn 2026 programme beginning 14 September; 73 adult September occurrences in the audit window are absent from production (88 occurrences if youth classes are included).
2. **Luminous Dance contains a duplicate event and incorrect times.** The 18 July “Luminous x The Sanctuary &Soul” appears twice from Eventbrite and Dandelion. The Dandelion page metadata says 19:00–21:15, while production says 18:00–20:15. The Eventbrite copy starts at 19:00 but production has no meaningful end time (`19:00–19:00`); Eventbrite metadata gives 21:30.
3. **Salsa! Soho points at an unsafe/irrelevant source.** Production’s `https://www.bar-salsa.com/soho` redirects to an unrelated gambling site. It currently yields zero listings, but it should be removed immediately as a source and outbound destination.

The in-app Browser was selected and retried with a fresh visible tab, but its webview failed to attach both times. Therefore no screenshot is presented as browser evidence. First-party pages were cross-checked through live web retrieval and the production adapters were run independently; findings below clearly distinguish confirmed first-party evidence from adapter-only checks.

## Confirmed correction queue

| Priority | Finding | Evidence | Required action |
|---|---|---|---|
| P0 | Salsa! Soho source redirects to unrelated gambling content | Live request to production source redirects to `mem-saab.com`; production venue count is zero | Disable the venue/source immediately, remove the outbound URL, and identify the current official timetable before re-enabling |
| P0 | The Place production data is stale | `/api/venues`: scrape failed with 403; last success 3 June. [The Place first-party timetable](https://theplace.org.uk/dance/classes-and-courses/) publishes Autumn 2026 classes from 14 September | Repair the 403 path or switch to the currently reachable page/endpoint, force-refresh `thePlace`, and verify retained stale sessions before publishing |
| P0 | The Place is missing September adult classes | Independent live adapter run found 73 missing adult occurrences between 14–30 September; first-party page lists the matching course names and term dates | Refresh after scraper repair; exclude youth-only rows if the product remains adult-focused |
| P1 | Luminous 18 July is duplicated across two sources | Same date/title/location exists at Eventbrite and Dandelion with separate booking URLs | Deduplicate by normalized organizer + title + date + start time/location, not booking URL alone; prefer the organizer’s canonical listing |
| P1 | Luminous Dandelion time is one hour early | [Dandelion listing](https://dandelion.events/e/w23ue) metadata: 19:00–21:15; production: 18:00–20:15 | Fix timezone conversion in the Dandelion parsing path and add a BST regression fixture |
| P1 | Luminous Eventbrite end time is invalid | [Eventbrite listing](https://www.eventbrite.com/e/luminous-x-the-sanctuary-soul-tickets-1990685150874) metadata: 19:00–21:30; production: 19:00–19:00 | Parse the Eventbrite end time; reject zero-duration events unless explicitly marked all-day |
| P1 | Rambert is missing two Gaga/people dates | Fresh official adapter output adds 15 and 22 July; production has four other July sessions | Force-refresh `rambert`; confirm the two Momence booking pages remain bookable |
| P1 | Chisenhale is missing two new events | Fresh official adapter output adds “Freedom” (14 August) and “‘this is a public square’” (27 August) | Force-refresh `chisenhaleDanceSpace` |
| P2 | cplay.cy two-day intensive is represented as one day | Title says “19&20 July 2026”; production has only 20 July with no times | Model both dates as occurrences, or retain one event with a 19–20 July range; confirm details with the organiser because the Google Form returns 401 to an unauthenticated request |
| P2 | Five Bachata Community rows on 11 September disappeared from a fresh run | Production has 264 summer rows; fresh source returned 259, with five 11 September rows absent | Recheck after the next source refresh; if still absent, evict rather than preserve them as recurring events |

## Venue-by-venue coverage

“Matched” means a fresh run of the existing adapter returned the same summer title/date tuples as production. It does not guarantee availability or cancellation status on every booking page.

| Venue | Production summer rows | Result | Notes |
|---|---:|---|---|
| Bachata Community | 264 | Monitor | Five 11 September rows disappeared in the fresh run; source itself exposes cancellations and per-event update ages, which should be ingested |
| Ballet for You | 27 | Matched | Fresh adapter matched all tuples; first-party page is visually sparse to non-JS retrieval |
| CI Calendar London | 46 | Matched | Fresh adapter matched all tuples; dynamic source limits independent visual confirmation |
| Chisenhale Dance Space | 3 | Missing coverage | Two newly published August events absent from production |
| Colet House | 4 | Matched | Fresh adapter matched all tuples |
| Danceworks | 127 | Volatile | Fresh timetable changed 35 tuples (14 added, 21 removed), mostly the rolling current week; refresh daily and avoid treating timetable churn as a stable term schedule |
| Luminous Dance | 6 | Incorrect | Confirmed duplicate and time/end-time errors |
| Pineapple Dance Studios | 303 | Volatile | Fresh timetable changed 59 tuples (13 added, 46 removed), mostly the rolling current week; production should refresh daily |
| Rambert | 4 | Missing coverage | Two Gaga/people dates newly present in the live source |
| Siobhan Davies Studios | 2 | Matched | Fresh adapter matched all tuples |
| Studio 66 | 51 | Matched | Fresh adapter matched all tuples through 31 August; dynamic booking system limits visual verification |
| Tango Fever | 35 | Structurally weak | Fresh tuples matched, but 33/35 production rows lack end times; first-party page confirms weekly classes but not all dated exceptions in static HTML |
| The Manor / MVMT | 31 | Rolling-day churn | Fresh run removed six 11 July rows; refresh before displaying “today” results |
| The Place | 115 | Stale/missing | September term missing; production scrape has failed since 3 June |
| TripSpace | 69 | Matched after curation | Fresh run adds 48 yoga rows intentionally removed by the existing Vinyasa curation rule; dance rows otherwise align |
| Wednesday Moving | 1 | Probable error | Production lists Heni Hale on 15 July, while the first-party public page only exposes dates through 1 July and says classes are term-time; requires organiser confirmation before keeping |
| cplay.cy | 2 | Incomplete representation | Two-day intensive collapsed to one date; source form is not publicly retrievable without authentication |

### Configured sources with no listings

- **Confirmed bad:** Salsa! Soho source redirects to unrelated gambling content.
- **Likely missing coverage:** BASE Dance Studios has a live weekly timetable and booking link but production count is zero; inspect its Wix/day pages or booking provider instead of the shell page.
- **Needs adapter review:** City Academy has a substantial live dance catalogue but production count is zero. Its catalogue is course-based rather than a simple weekly timetable, so course start dates should be the intended grain.
- **Needs manual/source confirmation:** Bar Salsa Temple, Con Tumbao Salsa, and Under the Sun Dance appear active but expose no usable production sessions. Under the Sun has also failed with 403 since 14 May.
- **Plausible true zeros:** Daniel Rodriguez, Rachel Mann & Marlon Who Henry, Gel, and 1Syllable had reachable/nominally successful sources but no current sessions. Recheck weekly rather than inventing recurrence.

## Data controls to add

1. **Stale-source quarantine:** do not silently present retained sessions when a venue has failed for more than seven days. Display “Source check failing” internally and suppress occurrences not independently reconfirmed after their last successful scrape.
2. **Freshness at listing level:** show “Checked 11 Jul” on cards or details. The homepage-wide “Listings last updated” date is not enough when The Place is five weeks older than Rambert.
3. **Duration validation:** flag `startTime === endTime`, missing end times for timed booking pages, and durations outside a sensible range.
4. **Cross-source deduplication:** normalize punctuation/spacing and compare title, organizer, date, start time, and location. Booking URL must not be the sole stable key.
5. **Range-title validation:** if a title contains two explicit dates (for example “19&20 July”), require two occurrences or a matching `endDate`.
6. **Rolling timetable rules:** refresh Danceworks, Pineapple, and The Manor daily; alert on removed current-day rows and count shifts over 20%.
7. **Broken-domain checks:** follow redirects and fail a source when its registrable domain changes unexpectedly.
8. **Cancellation/status ingestion:** preserve cancelled/sold-out/updated states where the source exposes them, especially Bachata Calendar and booking platforms.

## Product usefulness audit

### What works

- The value proposition is immediately understandable: filter London dance classes by style, level, date, and location.
- Week/month/calendar, venue, map, shortlist, contact, and calendar export cover the core discovery loop.
- The homepage publishes a global update date and offers a lightweight error-reporting route.

### Highest-impact improvements

1. Add **Today**, **Tonight**, **This weekend**, and **Next 7 days** shortcuts. These answer the most common intent faster than manipulating a date range.
2. Show a compact trust row on every listing: `Checked date · Source status · Drop-in/course · Booking status`.
3. Add structured **price**, **location/postcode**, **drop-in vs course**, **accessibility**, **age/audience**, and **sold-out/cancelled** fields. At present these are inconsistently embedded in titles or details and cannot be reliably filtered.
4. Treat recurring series as one card with selectable dates rather than visually repeating near-identical cards; keep individual occurrences in calendar/export data.
5. Add “Report this listing” on the class detail/card with the session ID prefilled. Keep the general contact CTA at the bottom of views.
6. Create shareable filtered URLs and weekly/style landing pages, such as `/this-week`, `/tonight`, and `/styles/contemporary`, using the existing filter vocabulary.
7. Replace personal social links with project-owned London Dance Calendar accounts once created.

## Social strategy: under one hour per week

### Positioning and channels

Use one promise consistently: **“Where can I dance in London this week?”**

- **Instagram:** primary discovery and community channel. Create a project-owned account and tag every featured teacher, organiser, and venue.
- **LinkedIn:** one monthly post about the project, data, partnerships, or technical lessons. Do not use it for the weekly class roundup.
- **Website:** canonical destination. Social posts should link to a saved filtered view, not list every detail in the caption.

### Weekly 55-minute workflow

| Time | Activity |
|---:|---|
| 10 min | Review an automatically generated shortlist: unusual workshops, weekend events, newly added listings, and open-level classes |
| 15 min | Create one carousel from a reusable template: “This week in London dance” |
| 10 min | Create one Friday Story: “Weekend picks” with a link sticker |
| 10 min | Tag featured venues/teachers and send one partnership/repost message |
| 10 min | Review saves, shares, site visits, outbound booking clicks, and corrections; note one lesson for next week |

### Four-week starter calendar

| Week | Main post | Story | CTA |
|---|---|---|---|
| 1 | 7 dance classes to try in London this week, spread across styles and price points | Three weekend picks | “Save this and browse the full calendar” |
| 2 | Beginner/open-level London dance guide | Poll: “Which style should we cover next?” | “Send this to someone who wants to start dancing” |
| 3 | Unusual workshops and one-off events | Last-minute places tonight/weekend | “Book from the live listing; details can change” |
| 4 | One neighbourhood spotlight, grouped by travel area | Repost a featured venue/teacher | “Tell us what is missing” |

### Reusable copy

**Bio**

> London dance classes and workshops, in one calendar. Filter by style, level, date and venue. Check details and book with the organiser. ↓

**Weekly caption**

> Looking for somewhere to dance in London this week? Here are a few picks across [styles/areas]. Save this post, tag your dance friend, and use London Dance Calendar for the live dates and booking links. Schedules can change—always check the organiser’s page before travelling.

**Partnership message**

> Hi [name] — I run London Dance Calendar, an independent calendar helping adults find dance classes and workshops across London. I featured [class/event] in this week’s roundup and linked directly to your booking page. If anything needs correcting, reply here or use the contact link. Reposts are very welcome.

### Metrics

Review four numbers monthly: visits from Instagram, outbound booking clicks, saves/shares per post, and submitted corrections/missing listings. Add returning visitor rate once analytics has enough volume. Follower count is secondary.

## Recommended sequence

1. Today: disable the Salsa! Soho source/link; force-refresh Rambert and Chisenhale; manually suppress one duplicate Luminous listing.
2. This week: repair The Place ingestion and publish the September adult term; fix Dandelion timezone and zero-duration validation.
3. Next: add stale-source quarantine, per-listing checked dates, redirect-domain monitoring, and range-title tests.
4. Then: ship Today/Tonight/Weekend shortcuts and structured price/location/drop-in fields.
5. Launch the project Instagram only after the first three data-integrity steps, so social growth sends people to a trustworthy calendar.

## Evidence limits

- The in-app Browser webview could not attach, so screenshots and interactive booking-state checks could not be completed in this run.
- Dynamic systems (Momence, Wellyx, Wix, Eventbrite, Google Forms) may expose details only after client-side rendering, location permission, login, or anti-bot checks.
- “Matched” is an adapter/source consistency result, not a guarantee that every class remains bookable.
- No production data or source code was changed as part of this audit.
