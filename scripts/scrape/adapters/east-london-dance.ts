import type { AdapterOutput } from "../types";
import { scrapeSimpleScheduleVenue } from "./simple-schedule-venue";

const sourceUrl = "https://eastlondondance.org/";

export async function scrapeEastLondonDance(): Promise<AdapterOutput> {
  return scrapeSimpleScheduleVenue({
    venueKey: "eastLondonDance",
    venue: "East London Dance",
    sourceUrl
  });
}
