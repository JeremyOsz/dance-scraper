import type { AdapterOutput } from "../types";
import { scrapeSimpleScheduleVenue } from "./simple-schedule-venue";

const sourceUrl = "https://www.dancebuzz.co.uk/";

export async function scrapeDancebuzz(): Promise<AdapterOutput> {
  return scrapeSimpleScheduleVenue({
    venueKey: "dancebuzz",
    venue: "Dancebuzz",
    sourceUrl
  });
}
