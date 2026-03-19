import type { VenueKey } from "../../lib/types";

export type ScrapedClass = {
  venue: string;
  title: string;
  details: string | null;
  dayOfWeek: string | null;
  time: string | null;
  startDate: string | null;
  endDate: string | null;
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
};
