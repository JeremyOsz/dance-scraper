import type { SessionExcludedDateRange, VenueKey } from "../../lib/types";
import type { DanceStyle } from "../../lib/dance-types";

export type ScrapedClass = {
  venue: string;
  organizer?: string;
  locationName?: string | null;
  address?: string | null;
  postcode?: string | null;
  borough?: string | null;
  styles?: DanceStyle[];
  title: string;
  details: string | null;
  dayOfWeek: string | null;
  time: string | null;
  startDate: string | null;
  endDate: string | null;
  excludedDateRanges?: SessionExcludedDateRange[];
  /** Adapter-level course classification; when omitted, normalization uses conservative inference. */
  isCourse?: boolean;
  bookingUrl: string;
  sourceUrl: string;
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
