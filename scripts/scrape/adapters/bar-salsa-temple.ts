import type { AdapterOutput } from "../types";
import { scrapeSimpleScheduleVenue } from "./simple-schedule-venue";

const sourceUrl = "https://www.barsalsa.com/temple/";

export async function scrapeBarSalsaTemple(): Promise<AdapterOutput> {
  return scrapeSimpleScheduleVenue({
    venueKey: "barSalsaTemple",
    venue: "Bar Salsa Temple",
    sourceUrl
  });
}
