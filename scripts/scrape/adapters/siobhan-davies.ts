import * as cheerio from "cheerio";
import type { AdapterOutput } from "../types";
import { absoluteUrl, fetchHtml } from "./common";

const sourceUrl = "https://www.siobhandavies.com/events/classes-2/";

export async function scrapeSiobhanDavies(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);
    const $ = cheerio.load(html);
    const classes: AdapterOutput["classes"] = [];

    let currentDay: string | null = null;
    $(".entry-content h2, .entry-content h3, .entry-content h4, .entry-content p, .entry-content div").each((_, el) => {
      const $el = $(el);
      if ($el.is("h3")) {
        const day = $el.text().trim();
        if (/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?$/i.test(day)) {
          currentDay = day.replace(/s$/, "");
        }
      }

      const heading = $el.is("h4") ? $el.text().trim() : $el.find("h4").first().text().trim();
      const title = heading.replace(/^\s+|\s+$/g, "");
      if (!title) return;
      if (/more info|book now/i.test(title)) return;

      const details = $el.find("p").first().text().trim() || null;
      const text = $el.text().replace(/\s+/g, " ").trim();
      const time = text.match(/\d{1,2}[:.]?\d{0,2}\s*[ap]m?\s*(?:-|–|to)\s*\d{1,2}[:.]?\d{0,2}\s*[ap]m?/i)?.[0] ?? null;
      const bookingUrl = absoluteUrl(sourceUrl, $el.find('a[href*="/classes/"], a[href*="bookwhen"], a[href*="siobhandavies.com/classes"]').first().attr("href"));
      if (!bookingUrl) return;

      classes.push({
        venue: "Siobhan Davies Studios",
        title,
        details,
        dayOfWeek: currentDay,
        time,
        startDate: null,
        endDate: null,
        bookingUrl,
        sourceUrl
      });
    });

    const unique = Array.from(new Map(classes.map((c) => [c.title + c.bookingUrl, c])).values());

    return {
      venueKey: "siobhanDavies",
      venue: "Siobhan Davies Studios",
      sourceUrl,
      classes: unique,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "siobhanDavies",
      venue: "Siobhan Davies Studios",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
