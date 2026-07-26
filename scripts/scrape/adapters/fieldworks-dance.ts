import * as cheerio from "cheerio";
import { format } from "date-fns";
import type { AdapterOutput, ScrapedClass } from "../types";
import { absoluteUrl, fetchHtml } from "./common";

const sourceUrl = "https://www.fieldworksdance.co.uk/book-online";
const TIME_RANGE_REGEX = /\b\d{1,2}(?::\d{2})?\s*(?:-|–|—|to)\s*\d{1,2}(?::\d{2})?\s*(?:[ap]m)?\b/i;
const DAY_REGEX = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?\b/i;
const CHILD_KEYWORDS = /\b(tiny dancer|kids?|children|child|youth|teens?|year olds?|ages?\s*\d)\b/i;
const SHORT_DATE_RANGE_REGEX = /\b(\d{1,2})\/(\d{1,2})\s*(?:-|–|—|to)\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function parseShortDateRange(text: string): { startDate: string | null; endDate: string | null } {
  const match = text.match(SHORT_DATE_RANGE_REGEX);
  if (!match) return { startDate: null, endDate: null };
  const currentYear = new Date().getFullYear();
  const rawYear = match[5] ? Number(match[5]) : currentYear;
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  const start = new Date(year, Number(match[2]) - 1, Number(match[1]));
  const end = new Date(year, Number(match[4]) - 1, Number(match[3]));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { startDate: null, endDate: null };
  }
  return { startDate: format(start, "yyyy-MM-dd"), endDate: format(end, "yyyy-MM-dd") };
}

function toClasses(html: string): ScrapedClass[] {
  const $ = cheerio.load(html);
  const classes: ScrapedClass[] = [];

  $("a[href*='fieldworksdance.as.me']").each((_, link) => {
    const bookingUrl = absoluteUrl(sourceUrl, $(link).attr("href")) ?? sourceUrl;
    const card = $(link).closest("li, [role='listitem']");
    if (card.length === 0) return;

    const paragraphs = card
      .find("p")
      .toArray()
      .map((node) => normalizeText($(node).text()))
      .filter(Boolean);
    if (paragraphs.length === 0) return;

    const title = paragraphs[0];
    const schedule = paragraphs.find((text) => DAY_REGEX.test(text) && TIME_RANGE_REGEX.test(text)) ?? null;
    const detailsText = paragraphs.slice(2).join(" ");
    const details = normalizeText([schedule, detailsText].filter(Boolean).join(" | ")) || null;
    const haystack = `${title} ${details ?? ""}`;

    if (CHILD_KEYWORDS.test(haystack)) return;

    const dayOfWeek = schedule?.match(DAY_REGEX)?.[1] ?? null;
    const time = schedule?.match(TIME_RANGE_REGEX)?.[0] ?? null;
    const { startDate, endDate } = parseShortDateRange(`${schedule ?? ""} ${detailsText}`);

    classes.push({
      venue: "Fieldworks Dance",
      title,
      details,
      dayOfWeek,
      time,
      startDate,
      endDate,
      bookingUrl,
      sourceUrl
    });
  });

  return Array.from(
    new Map(classes.map((item) => [`${item.title}|${item.dayOfWeek ?? "na"}|${item.time ?? "na"}|${item.bookingUrl}`, item])).values()
  );
}

export async function scrapeFieldworksDance(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);

    return {
      venueKey: "fieldworksDance",
      venue: "Fieldworks Dance",
      sourceUrl,
      classes: toClasses(html),
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "fieldworksDance",
      venue: "Fieldworks Dance",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
