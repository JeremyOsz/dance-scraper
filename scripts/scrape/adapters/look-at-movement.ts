import type { AdapterOutput } from "../types";
import { scrapeSimpleScheduleVenue } from "./simple-schedule-venue";

const sourceUrl = "https://www.lookatmovement.co.uk/";

export async function scrapeLookAtMovement(): Promise<AdapterOutput> {
  return scrapeSimpleScheduleVenue({
    venueKey: "lookAtMovement",
    venue: "Look At Movement",
    sourceUrl
  });
}
