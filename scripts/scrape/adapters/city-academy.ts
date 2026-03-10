import type { AdapterOutput } from "../types";
import { scrapeSimpleScheduleVenue } from "./simple-schedule-venue";

const sourceUrl = "https://www.city-academy.com/Dance-Classes";

export async function scrapeCityAcademy(): Promise<AdapterOutput> {
  return scrapeSimpleScheduleVenue({
    venueKey: "cityAcademy",
    venue: "City Academy",
    sourceUrl
  });
}
