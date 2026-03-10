import type { AdapterOutput } from "../types";
import { scrapeSimpleScheduleVenue } from "./simple-schedule-venue";

const sourceUrl = "https://www.danceworks.com/london/classes/timetable/";

export async function scrapeDanceworks(): Promise<AdapterOutput> {
  return scrapeSimpleScheduleVenue({
    venueKey: "danceworks",
    venue: "Danceworks",
    sourceUrl
  });
}
