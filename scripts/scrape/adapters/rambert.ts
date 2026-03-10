import * as cheerio from "cheerio";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://rambert.org.uk/classes/";

export async function scrapeRambert(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);
    const $ = cheerio.load(html);
    const classes: AdapterOutput["classes"] = [];

    // Rambert embeds class schedules via Momence; static HTML has little class data.
    // Keep adapter strict to avoid footer/menu pollution.
    const timetableLinks = [
      $('a[href*="momence.com"][href*="host"]').first().attr("href"),
      $('a[href*="?season=non-momence"]').first().attr("href"),
      $('a[href*="participation/classes"]').first().attr("href")
    ].filter((link): link is string => Boolean(link));

    for (const link of timetableLinks) {
      classes.push({
        venue: "Rambert",
        title: "Rambert Classes Timetable",
        details: "Official timetable source",
        dayOfWeek: null,
        time: null,
        startDate: null,
        endDate: null,
        bookingUrl: new URL(link, sourceUrl).toString(),
        sourceUrl
      });
    }

    return {
      venueKey: "rambert",
      venue: "Rambert",
      sourceUrl,
      classes: Array.from(new Map(classes.map((c) => [c.bookingUrl, c])).values()),
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "rambert",
      venue: "Rambert",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
