# Featured Venues & Sessions — Design Spec

**Date:** 2026-03-22
**Status:** Approved

---

## Overview

Certain venues or organisers should be promoted to the top of each day's session list and visually distinguished with a gold/amber style. A new static config file (`lib/featured.ts`) defines matching rules; no scrapers or session data files need to change.

---

## 1. Config — `lib/featured.ts`

### Data shape

```ts
import type { VenueKey } from "@/lib/types";
import type { DanceSession } from "@/lib/types";

export type FeaturedRule = {
  venueKey?: VenueKey;      // matches all sessions from this venue
  titleContains?: string;   // case-insensitive substring match on session.title
  tag?: string;             // exact match against any entry in session.tags[]
};
```

### Exported constants and functions

| Export | Purpose |
|---|---|
| `FEATURED_RULES: FeaturedRule[]` | Array of rules; initially empty (no featured items until populated). |
| `isFeaturedSession(session: DanceSession): boolean` | Returns true if any rule matches the session. Matching: `venueKey` checks `VENUES[key].label === session.venue`; `titleContains` is a case-insensitive `includes`; `tag` is an exact match against `session.tags`. |
| `isFeaturedVenueKey(key: VenueKey): boolean` | Returns true if any rule has `venueKey === key`. Used by the venues tab. |

### Matching semantics

- A session matches a rule if **all specified fields** on that rule match (AND within a rule).
- A session is featured if it matches **any** rule (OR across rules).
- An empty `FEATURED_RULES` array means nothing is featured.

### Example config

```ts
export const FEATURED_RULES: FeaturedRule[] = [
  { venueKey: "thePlace" },
  { titleContains: "Adrian" },
  { tag: "somatic" },
];
```

---

## 2. Calendar view — session cards

### Sort order

Within each day's session list (week view and undated section), sessions are stable-sorted so featured sessions appear first. Time order is preserved within the featured group and within the non-featured group.

The same sort applies in both week view (per-date bucket) and the undated sessions section.

### Visual style

Featured cards replace the `DANCE_TYPE_CARD_CLASS` with:

```
border-amber-400 bg-amber-50 ring-1 ring-amber-300
```

A small label is rendered above the session title:

```tsx
<span className="text-[10px] font-semibold text-amber-600">★ Featured</span>
```

No other card layout changes.

---

## 3. Venues tab

### Sort order

Featured venues are sorted to the top of the venue grid, ahead of active venues, then muted (zero-session) venues.

### Visual style

Featured venue cards receive additional Tailwind classes on `<Card>`:

```
border-amber-400 ring-1 ring-amber-300
```

A `★ Featured` badge is added alongside the existing status badge:

```tsx
<Badge className="border-amber-400 bg-amber-50 text-amber-700">★ Featured</Badge>
```

---

## 4. Files changed

| File | Change |
|---|---|
| `lib/featured.ts` | **New.** Config array and two utility functions. |
| `components/calendar/calendar-page.tsx` | Import `isFeaturedSession` and `isFeaturedVenueKey`; apply sort and styles in calendar and venues tab. |

No changes to scrapers, data files, API routes, or types.

---

## 5. Out of scope

- Featured filter toggle in the UI (not requested).
- Priority weighting between featured rules (YAGNI).
- Persisting featured state to URL params.
