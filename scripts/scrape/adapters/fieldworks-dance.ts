import * as cheerio from "cheerio";
import type { AdapterOutput, ScrapedClass } from "../types";
import { absoluteUrl, fetchHtml } from "./common";

const sourceUrl = "https://www.fieldworksdance.co.uk/book-online";
const TIME_RANGE_REGEX = /\b\d{1,2}(?::\d{2})?\s*(?:-|–|—|to)\s*\d{1,2}(?::\d{2})?\s*(?:[ap]m)?\b/i;
const DAY_REGEX = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?\b/i;
const CHILD_KEYWORDS = /\b(tiny dancer|kids?|children|child|youth|teens?|year olds?|ages?\s*\d)\b/i;

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
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

    classes.push({
      venue: "Fieldworks Dance",
      title,
      details,
      dayOfWeek,
      time,
      startDate: null,
      endDate: null,
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
