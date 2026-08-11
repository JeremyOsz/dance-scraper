import * as cheerio from "cheerio";
import { format, parseISO } from "date-fns";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://www.swingland.com/";

function clean(value?: string) {
  return value ? cheerio.load(value).text().replace(/\s+/g, " ").trim() : "";
}

function splitAddress(raw: string) {
  const postcode = raw.match(/\b(?:[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i)?.[0]?.toUpperCase() ?? null;
  const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
  const locationName = parts.find((part) => !/^swingland/i.test(part)) ?? null;
  return { locationName, address: raw || null, postcode };
}

export function parseSwinglandHtml(html: string): AdapterOutput["classes"] {
  const $ = cheerio.load(html);
  return $("option[data-n][data-url]").toArray().flatMap((element) => {
    const option = $(element);
    const title = clean(option.attr("data-n"));
    const details = clean(option.attr("data-d"));
    const dateValue = option.attr("value") ?? "";
    const addressValue = clean(option.attr("data-a"));
    const bookingUrl = option.attr("data-url");
    if (!title || !bookingUrl || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return [];
    const instructionText = `${title} ${details}`;
    if (!/(class|workshop|learn|teaching|beginners|improvers)/i.test(instructionText) || /social dancing/i.test(title)) return [];
    const time = details.match(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)(?:\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm))?/i)?.[0] ?? null;
    const location = splitAddress(addressValue);
    const date = parseISO(dateValue);
    return [{
      venue: "Swingland",
      organizer: "Swingland",
      ...location,
      title,
      details: details || null,
      dayOfWeek: format(date, "EEEE"),
      time,
      startDate: dateValue,
      endDate: dateValue,
      bookingUrl: new URL(bookingUrl, sourceUrl).toString(),
      sourceUrl
    }];
  });
}

export async function scrapeSwingland(): Promise<AdapterOutput> {
  try {
    const classes = parseSwinglandHtml(await fetchHtml(sourceUrl));
    return { venueKey: "swingland", venue: "Swingland", sourceUrl, classes, ok: true, error: null };
  } catch (error) {
    return { venueKey: "swingland", venue: "Swingland", sourceUrl, classes: [], ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
