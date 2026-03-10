import * as cheerio from "cheerio";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://www.butohuk.com/";

export async function scrapeButohMutation(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);
    const $ = cheerio.load(html);
    const metaDescription = $('meta[name="description"]').attr("content")?.trim() ?? null;

    return {
      venueKey: "butohMutation",
      venue: "Butoh Mutation",
      sourceUrl,
      classes: [
        {
          venue: "Butoh Mutation",
          title: "Butoh Mutation Classes & Workshops",
          details: metaDescription,
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
      venueKey: "butohMutation",
      venue: "Butoh Mutation",
      sourceUrl,
      classes: [
        {
          venue: "Butoh Mutation",
          title: "Butoh Mutation Classes & Workshops",
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
