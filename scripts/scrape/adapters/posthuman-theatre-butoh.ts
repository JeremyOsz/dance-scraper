import * as cheerio from "cheerio";
import { endOfDay, format, isBefore, parse } from "date-fns";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://www.posthumantheatre.com/workshops";
const NUMERIC_DATE = /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/;
const MONTH_RANGE = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[-–]\s*(\d{1,2})(?:st|nd|rd|th)?)?(?:,\s*|\s+)(20\d{2})\b/i;

function parseWorkshopDate(text: string, now: Date): { start: Date; end: Date; dateText: string } | null {
  const numeric = text.match(NUMERIC_DATE);
  if (numeric) {
    const date = parse(`${numeric[1]}/${numeric[2]}/${numeric[3]}`, "d/M/yyyy", now);
    return Number.isNaN(date.getTime()) ? null : { start: date, end: date, dateText: numeric[0] };
  }
  const range = text.match(MONTH_RANGE);
  if (!range) return null;
  const year = Number(range[4]);
  const start = parse(`${range[2]} ${range[1]} ${year}`, "d MMMM yyyy", now);
  const end = parse(`${range[3] ?? range[2]} ${range[1]} ${year}`, "d MMMM yyyy", now);
  return Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())
    ? null
    : { start, end, dateText: range[0] };
}

export function parsePosthumanWorkshopsHtml(html: string, now = new Date()): AdapterOutput["classes"] {
  const $ = cheerio.load(html);
  const classes: AdapterOutput["classes"] = [];
  $("h1 a, h2 a, h3 a, h4 a, h5 a, h6 a").each((_, link) => {
    const text = $(link).text().replace(/\s+/g, " ").trim();
    const dates = parseWorkshopDate(text, now);
    if (!dates || isBefore(endOfDay(dates.end), now)) return;
    const href = $(link).attr("href")?.trim();
    const details = $(link).parent().next("p").text().replace(/\s+/g, " ").trim() || null;
    const title = text.replace(dates.dateText, "").replace(/[\s.:–-]+$/, "").replace(/\s+/g, " ").trim();
    classes.push({
      venue: "Posthuman Theatre Butoh",
      organizer: "Posthuman Theatre Butoh",
      styles: ["Butoh"],
      title,
      details,
      dayOfWeek: format(dates.start, "EEEE"),
      time: null,
      startDate: format(dates.start, "yyyy-MM-dd"),
      endDate: format(dates.end, "yyyy-MM-dd"),
      bookingUrl: href ? new URL(href, sourceUrl).toString() : sourceUrl,
      sourceUrl
    });
  });
  return classes;
}

export async function scrapePosthumanTheatreButoh(): Promise<AdapterOutput> {
  try {
    const classes = parsePosthumanWorkshopsHtml(await fetchHtml(sourceUrl));
    return { venueKey: "posthumanTheatreButoh", venue: "Posthuman Theatre Butoh", sourceUrl, classes, ok: true, error: null };
  } catch (error) {
    return {
      venueKey: "posthumanTheatreButoh",
      venue: "Posthuman Theatre Butoh",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
