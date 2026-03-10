import type { AdapterOutput } from "../types";
import { scrapeSimpleScheduleVenue } from "./simple-schedule-venue";

const sourceUrl = "https://www.themanorldn.com/mvmt";

export async function scrapeTheManorMvmt(): Promise<AdapterOutput> {
  return scrapeSimpleScheduleVenue({
    venueKey: "theManorMvmt",
    venue: "The Manor / MVMT",
    sourceUrl
  });
}
