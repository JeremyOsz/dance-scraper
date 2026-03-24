import type { SessionExcludedDateRange, VenueKey } from "../../lib/types";

export type ScrapedClass = {
  venue: string;
  title: string;
  details: string | null;
  dayOfWeek: string | null;
  time: string | null;
  startDate: string | null;
  endDate: string | null;
  excludedDateRanges?: SessionExcludedDateRange[];
  bookingUrl: string;
  sourceUrl: string;
  /** Override: true when the class requires upfront enrollment, not drop-in. */
  enrollmentOnly?: boolean;
};

export type AdapterOutput = {
  venueKey: VenueKey;
  venue: string;
  sourceUrl: string;
  classes: ScrapedClass[];
  ok: boolean;
  error: string | null;
  /** Distinct venue labels in this scrape; merge uses with prior labels to evict replaced sessions. */
  replacedVenueLabels?: string[];
};
