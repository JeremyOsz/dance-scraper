import * as cheerio from "cheerio";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://posthuman.works/butoh-classes-workshops";

function firstNonEmpty(values: Array<string | undefined | null>): string | null {
  for (const value of values) {
    if (value && value.trim()) return value.trim();
  }
  return null;
}

export async function scrapePosthumanTheatreButoh(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);
    const $ = cheerio.load(html);
    const details = firstNonEmpty([
      $('meta[name="description"]').attr("content"),
      $("h1").first().text(),
      $("title").text()
    ]);

    return {
      venueKey: "posthumanTheatreButoh",
      venue: "Posthuman Theatre Butoh",
      sourceUrl,
      classes: [
        {
          venue: "Posthuman Theatre Butoh",
          title: "Posthuman Theatre Butoh Class",
          details,
          dayOfWeek: null,
          time: null,
          startDate: null,
          endDate: null,
          bookingUrl: sourceUrl,
          sourceUrl
        }
      ],
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "posthumanTheatreButoh",
      venue: "Posthuman Theatre Butoh",
      sourceUrl,
      classes: [
        {
          venue: "Posthuman Theatre Butoh",
          title: "Posthuman Theatre Butoh Class",
          details: "Source currently unavailable. Check venue page for latest schedule.",
          dayOfWeek: null,
          time: null,
          startDate: null,
          endDate: null,
          bookingUrl: sourceUrl,
          sourceUrl
        }
      ],
      ok: true,
      error: null
    };
  }
}
