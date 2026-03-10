import * as cheerio from "cheerio";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://www.salsa4fun.co.uk/class-schedule";

function normalizeTitle(raw: string) {
  return raw.replace(/\s+/g, " ").trim();
}

export async function scrapeSuperMarioSalsa(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);
    const $ = cheerio.load(html);
    const classes: AdapterOutput["classes"] = [];

    $("h3").each((_, el) => {
      const heading = normalizeTitle($(el).text());
      if (!heading) return;
      if (!/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i.test(heading)) return;
      if (!/(class|drop-in|course|salsa)/i.test(heading)) return;

      const day = heading.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i)?.[1] ?? null;
      classes.push({
        venue: "SuperMario Salsa",
        title: `SuperMario Salsa ${day ? `- ${day}` : ""}`.replace(/\s+/g, " ").trim(),
        details: heading,
        dayOfWeek: day,
        time: null,
        startDate: null,
        endDate: null,
        bookingUrl: sourceUrl,
        sourceUrl
      });
    });

    return {
      venueKey: "superMarioSalsa",
      venue: "SuperMario Salsa",
      sourceUrl,
      classes: Array.from(new Map(classes.map((item) => [item.title + item.dayOfWeek, item])).values()),
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "superMarioSalsa",
      venue: "SuperMario Salsa",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
