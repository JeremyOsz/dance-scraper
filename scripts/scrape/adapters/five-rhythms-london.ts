import * as cheerio from "cheerio";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://www.5rhythms.com/classes/London";

export async function scrapeFiveRhythmsLondon(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);
    const $ = cheerio.load(html);
    const infoText = $("#classesteachers_single .information").text().replace(/\s+/g, " ").trim();

    const classes: AdapterOutput["classes"] = [];
    if (infoText) {
      const time = infoText.match(/\d{1,2}[:.]?\d{0,2}\s*(?:am|pm)?\s*(?:-|–|to)\s*\d{1,2}[:.]?\d{0,2}\s*(?:am|pm)?/i)?.[0] ?? null;
      const day = infoText.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i)?.[1] ?? null;

      classes.push({
        venue: "Five Rhythms London",
        title: "5Rhythms London Class",
        details: infoText,
        dayOfWeek: day,
        time,
        startDate: null,
        endDate: null,
        bookingUrl: sourceUrl,
        sourceUrl
      });
    }

    return {
      venueKey: "fiveRhythmsLondon",
      venue: "Five Rhythms London",
      sourceUrl,
      classes,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "fiveRhythmsLondon",
      venue: "Five Rhythms London",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
