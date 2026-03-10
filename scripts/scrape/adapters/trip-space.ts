import * as cheerio from "cheerio";
import type { AdapterOutput } from "../types";
import { absoluteUrl, fetchHtml } from "./common";

const sourceUrl = "https://tripspace.co.uk/dance/";

export async function scrapeTripSpace(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);
    const $ = cheerio.load(html);
    const classes: AdapterOutput["classes"] = [];

    $("article, .tribe-events, .event, .entry, .post").each((_, el) => {
      const title = $(el).find("h2, h3, h4, .entry-title").first().text().trim();
      if (!title || title.length < 5) return;

      const text = $(el).text().replace(/\s+/g, " ");
      const day = text.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i)?.[1] ?? null;
      const time = text.match(/\d{1,2}[:.]?\d{0,2}\s*(?:am|pm)?\s*(?:-|–|to)\s*\d{1,2}[:.]?\d{0,2}\s*(?:am|pm)?/i)?.[0] ?? null;
      const href = $(el).find('a[href*="event"], a[href*="workshop"], a[href*="dance"], a[href*="booking"]').first().attr("href");
      const bookingUrl = absoluteUrl(sourceUrl, href);
      if (!bookingUrl) return;
      if (!/(dance|movement|yoga|workshop|somatic|improv|class)/i.test(`${title} ${text}`)) return;

      classes.push({
        venue: "TripSpace",
        title,
        details: $(el).find("p").first().text().trim() || null,
        dayOfWeek: day,
        time,
        startDate: null,
        endDate: null,
        bookingUrl,
        sourceUrl
      });
    });

    const unique = Array.from(new Map(classes.map((c) => [c.title + c.bookingUrl, c])).values());

    return {
      venueKey: "tripSpace",
      venue: "TripSpace",
      sourceUrl,
      classes: unique,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "tripSpace",
      venue: "TripSpace",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
