import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://www.the-baths.co.uk/";

export async function scrapeHackneyBaths(): Promise<AdapterOutput> {
  try {
    await fetchHtml(sourceUrl);
    return {
      venueKey: "hackneyBaths",
      venue: "Hackney Baths",
      sourceUrl,
      classes: [],
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "hackneyBaths",
      venue: "Hackney Baths",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
