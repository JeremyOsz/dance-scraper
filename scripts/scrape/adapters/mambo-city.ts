import type { AdapterOutput } from "../types";
import { scrapeSimpleScheduleVenue } from "./simple-schedule-venue";

const sourceUrl = "https://www.mambocity.co.uk/";

export async function scrapeMamboCity(): Promise<AdapterOutput> {
  return scrapeSimpleScheduleVenue({
    venueKey: "mamboCity",
    venue: "MamboCity",
    sourceUrl
  });
}
