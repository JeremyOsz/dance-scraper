import * as cheerio from "cheerio";
import { endOfDay, format, isBefore, parse } from "date-fns";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://www.butohuk.com/londonbutohworkshops";
const DATE_RANGE = /\b(?:Saturday|Sunday)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\s+and\s+(?:Saturday|Sunday)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;

function cleanWorkshopTitle(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(DATE_RANGE, "")
    .replace(/[\s.:–-]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseButohUkHtml(html: string, now = new Date()): AdapterOutput["classes"] {
  const $ = cheerio.load(html);
  const year = Number($("h1").first().text().match(/\b(20\d{2})\b/)?.[1] ?? now.getFullYear());
  const details = $('meta[name="description"]').attr("content")?.replace(/\s+/g, " ").trim()
    || "Two-day London Butoh workshop with Marie-Gabrielle Rotie and live sound by Nick Parkin.";
  const classes: AdapterOutput["classes"] = [];

  $("a").each((_, link) => {
    const text = $(link).text().replace(/\s+/g, " ").trim();
    const match = text.match(DATE_RANGE);
    if (!match) return;
    const start = parse(`${match[2]} ${match[1]} ${year}`, "d MMMM yyyy", now);
    const end = parse(`${match[3]} ${match[1]} ${year}`, "d MMMM yyyy", now);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || isBefore(endOfDay(end), now)) return;

    const href = $(link).attr("href")?.trim();
    classes.push({
      venue: "Butoh UK",
      organizer: "Butoh UK",
      locationName: "London School of Capoeira",
      address: "Unit 1 and 2, Leeds Place",
      postcode: "N4 3RF",
      borough: "Islington",
      styles: ["Butoh"],
      title: cleanWorkshopTitle(text),
      details,
      dayOfWeek: format(start, "EEEE"),
      time: "11am - 5pm",
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
      bookingUrl: href ? new URL(href, sourceUrl).toString() : sourceUrl,
      sourceUrl
    });
  });

  return Array.from(new Map(classes.map((item) => [`${item.title}|${item.startDate}`, item])).values());
}

export async function scrapeButohUk(): Promise<AdapterOutput> {
  try {
    const classes = parseButohUkHtml(await fetchHtml(sourceUrl));
    return { venueKey: "butohUk", venue: "Butoh UK", sourceUrl, classes, ok: true, error: null };
  } catch (error) {
    return {
      venueKey: "butohUk",
      venue: "Butoh UK",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
