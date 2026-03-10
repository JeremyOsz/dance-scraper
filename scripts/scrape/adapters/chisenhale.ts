import * as cheerio from "cheerio";
import type { AdapterOutput } from "../types";
import { absoluteUrl, fetchHtml } from "./common";

const sourceUrl = "https://www.chisenhaledancespace.co.uk/independent-events/";
const childrenOnlyPattern = /\b(\d+\s*-\s*\d+\s*years?|kids?|children|child|youth|teen)\b/i;
const meridiemTimeRangePattern =
  /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*(?:-|–|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i;
const twentyFourHourRangePattern = /\b(?:[01]?\d|2[0-3]):[0-5]\d\s*(?:-|–|to)\s*(?:[01]?\d|2[0-3]):[0-5]\d\b/i;

export async function scrapeChisenhale(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);
    const $ = cheerio.load(html);
    const classes: AdapterOutput["classes"] = [];

    $(".main-content.classes .image-card.whats-on-card, .new-cards .image-card.whats-on-card").each((_, el) => {
      const title = $(el).find(".heading strong, .heading, h2, h3").first().text().trim();
      if (!title || title.length < 4) return;

      const text = $(el).text().replace(/\s+/g, " ");
      if (childrenOnlyPattern.test(`${title} ${text}`)) return;

      const day = text.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i)?.[1] ?? null;
      const classTimeText = $(el).find(".class-time").first().text().trim();
      const time =
        classTimeText.match(meridiemTimeRangePattern)?.[0] ??
        classTimeText.match(twentyFourHourRangePattern)?.[0] ??
        text.match(meridiemTimeRangePattern)?.[0] ??
        text.match(twentyFourHourRangePattern)?.[0] ??
        null;
      const bookingUrl = absoluteUrl(
        sourceUrl,
        $(el).find("a.image[href*='/whatson/'], a.button-design[href*='/whatson/'], a[href*='/whatson/']").first().attr("href")
      );
      if (!bookingUrl) return;

      classes.push({
        venue: "Chisenhale Dance Space",
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

    return {
      venueKey: "chisenhaleDanceSpace",
      venue: "Chisenhale Dance Space",
      sourceUrl,
      classes: Array.from(new Map(classes.map((c) => [c.title + c.bookingUrl, c])).values()),
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "chisenhaleDanceSpace",
      venue: "Chisenhale Dance Space",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
