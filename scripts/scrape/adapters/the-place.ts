import * as cheerio from "cheerio";
import type { AdapterOutput } from "../types";
import { absoluteUrl, fetchHtml } from "./common";

const sourceUrl = "https://theplace.org.uk/dance/classes-and-courses";

export async function scrapeThePlace(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);
    const $ = cheerio.load(html);
    const classes = $(".c-event-card__header")
      .closest("a")
      .map((_, el) => {
        const title = $(el).find(".c-event-card__title").first().text().trim();
        const details = $(el).find(".c-event-card__subtitle").first().text().trim() || null;
        const day = $(el).find(".c-event-card__header").first().text().trim().replace(/s$/, "");
        const time = $(el).find(".c-event-card__date").first().text().trim() || null;
        const link = absoluteUrl(sourceUrl, $(el).attr("href"));
        if (!title || !link) return null;
        return {
          venue: "The Place",
          title,
          details,
          dayOfWeek: day || null,
          time,
          startDate: null,
          endDate: null,
          bookingUrl: link,
          sourceUrl
        };
      })
      .get()
      .filter(Boolean);

    return {
      venueKey: "thePlace",
      venue: "The Place",
      sourceUrl,
      classes,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "thePlace",
      venue: "The Place",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
