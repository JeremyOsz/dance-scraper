import type { AdapterOutput } from "../types";
import { scrapeSimpleScheduleVenue } from "./simple-schedule-venue";

const sourceUrl = "https://www.underthesundance.com/";

export async function scrapeUnderTheSunDance(): Promise<AdapterOutput> {
  return scrapeSimpleScheduleVenue({
    venueKey: "underTheSunDance",
    venue: "Under the Sun Dance",
    sourceUrl
  });
}
