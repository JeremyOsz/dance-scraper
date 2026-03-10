import type { AdapterOutput } from "../types";
import { scrapeSimpleScheduleVenue } from "./simple-schedule-venue";

const sourceUrl = "https://www.pineapple.uk.com/pages/studio-classes-timetable";

export async function scrapePineappleDanceStudios(): Promise<AdapterOutput> {
  return scrapeSimpleScheduleVenue({
    venueKey: "pineappleDanceStudios",
    venue: "Pineapple Dance Studios",
    sourceUrl
  });
}
