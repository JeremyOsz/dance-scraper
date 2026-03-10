import type { AdapterOutput } from "../types";
import { scrapeSimpleScheduleVenue } from "./simple-schedule-venue";

const sourceUrl = "https://www.salsa-soho.com/";

export async function scrapeSalsaSoho(): Promise<AdapterOutput> {
  return scrapeSimpleScheduleVenue({
    venueKey: "salsaSoho",
    venue: "Salsa! Soho",
    sourceUrl
  });
}
