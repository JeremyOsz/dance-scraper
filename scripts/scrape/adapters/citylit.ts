import type { AdapterOutput } from "../types";
import { scrapeSimpleScheduleVenue } from "./simple-schedule-venue";

const sourceUrl = "https://www.citylit.ac.uk/courses/arts-and-culture/dance";

export async function scrapeCitylit(): Promise<AdapterOutput> {
  return scrapeSimpleScheduleVenue({
    venueKey: "citylit",
    venue: "Citylit",
    sourceUrl
  });
}
