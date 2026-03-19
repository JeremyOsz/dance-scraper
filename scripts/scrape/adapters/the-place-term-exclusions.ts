import type { SessionExcludedDateRange } from "../../../lib/types";

/**
 * When Camden state schools are closed: half-terms plus holidays between terms.
 * The Place’s term-time classes and courses typically do not run on these dates.
 *
 * 2025/26 academic year (review and extend each year).
 * @see https://www.gov.uk/school-term-holiday-dates/camden
 */
export const THE_PLACE_CAMDEN_TERM_CLOSURES: SessionExcludedDateRange[] = [
  { start: "2025-10-27", end: "2025-10-31" },
  { start: "2025-12-22", end: "2026-01-02" },
  { start: "2026-02-16", end: "2026-02-20" },
  { start: "2026-03-30", end: "2026-04-10" },
  { start: "2026-05-25", end: "2026-05-29" },
  /** After summer term ends (~20 Jul); through day before autumn 2026/27 pupil start (typically first Mon in Sep). */
  { start: "2026-07-21", end: "2026-09-06" }
];
