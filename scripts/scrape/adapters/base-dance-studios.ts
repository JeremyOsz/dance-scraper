import type { AdapterOutput } from "../types";
import { scrapeSimpleScheduleVenue } from "./simple-schedule-venue";

const sourceUrl = "https://www.basedancestudios.com/weekly-timetable-2";

export async function scrapeBaseDanceStudios(): Promise<AdapterOutput> {
  return scrapeSimpleScheduleVenue({
    venueKey: "baseDanceStudios",
    venue: "BASE Dance Studios",
    sourceUrl
  });
}
