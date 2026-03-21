import * as cheerio from "cheerio";
import { format } from "date-fns";
import type { AdapterOutput, ScrapedClass } from "../types";
import { absoluteUrl, fetchHtml } from "./common";

const sourceUrl = "https://linktr.ee/cplay.cy";
const venue = "cplay.cy";
const DAY_REGEX = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i;
const TIME_RANGE_REGEX =
  /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))(?:\s*(?:-|–|—|to)\s*)(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i;
const TIME_SINGLE_REGEX = /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i;

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11
};

type DateInfo = {
  dayOfWeek: string | null;
  startDate: string | null;
  endDate: string | null;
};

function normalizeText(input: string | null | undefined): string {
  return (input ?? "").replace(/\s+/g, " ").trim();
}

function isGoogleFormUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname === "forms.gle") return true;
    if (parsed.hostname === "docs.google.com" && parsed.pathname.includes("/forms/")) return true;
    return false;
  } catch {
    return false;
  }
}

function inferYear(monthIndex: number, now: Date): number {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  return monthIndex < currentMonth - 1 ? currentYear + 1 : currentYear;
}

function toIsoDate(year: number, monthIndex: number, day: number): string | null {
  const date = new Date(Date.UTC(year, monthIndex, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return format(date, "yyyy-MM-dd");
}

function parseDateInfo(text: string, now: Date): DateInfo {
  const cleaned = normalizeText(text);
  if (!cleaned) {
    return { dayOfWeek: null, startDate: null, endDate: null };
  }

  const explicit = cleaned.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(\d{4}))?\b/i
  );
  const reverse = cleaned.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/i
  );
  const slash = cleaned.match(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/);
  const dayOfWeek = cleaned.match(DAY_REGEX)?.[1] ?? null;

  if (explicit) {
    const day = Number(explicit[1]);
    const monthIndex = MONTH_INDEX[explicit[2].toLowerCase()];
    const year = explicit[3] ? Number(explicit[3]) : inferYear(monthIndex, now);
    const iso = toIsoDate(year, monthIndex, day);
    if (iso) {
      return {
        dayOfWeek:
          dayOfWeek ??
          format(new Date(`${iso}T00:00:00`), "EEEE"),
        startDate: iso,
        endDate: iso
      };
    }
  }

  if (reverse) {
    const monthIndex = MONTH_INDEX[reverse[1].toLowerCase()];
    const day = Number(reverse[2]);
    const year = reverse[3] ? Number(reverse[3]) : inferYear(monthIndex, now);
    const iso = toIsoDate(year, monthIndex, day);
    if (iso) {
      return {
        dayOfWeek:
          dayOfWeek ??
          format(new Date(`${iso}T00:00:00`), "EEEE"),
        startDate: iso,
        endDate: iso
      };
    }
  }

  if (slash) {
    const day = Number(slash[1]);
    const monthIndex = Number(slash[2]) - 1;
    const yearPart = slash[3];
    const year =
      !yearPart ? inferYear(monthIndex, now) : yearPart.length === 2 ? 2000 + Number(yearPart) : Number(yearPart);
    const iso = toIsoDate(year, monthIndex, day);
    if (iso) {
      return {
        dayOfWeek:
          dayOfWeek ??
          format(new Date(`${iso}T00:00:00`), "EEEE"),
        startDate: iso,
        endDate: iso
      };
    }
  }

  return { dayOfWeek, startDate: null, endDate: null };
}

function toClasses(html: string): ScrapedClass[] {
  const $ = cheerio.load(html);
  const now = new Date();
  const classes: ScrapedClass[] = [];
  const seenUrls = new Set<string>();

  $("a[href]").each((_, link) => {
    const bookingUrl = absoluteUrl(sourceUrl, $(link).attr("href"));
    if (!bookingUrl || !isGoogleFormUrl(bookingUrl)) return;
    if (seenUrls.has(bookingUrl)) return;
    seenUrls.add(bookingUrl);

    const title = normalizeText($(link).text()) || "Workshop registration";
    const dateInfo = parseDateInfo(title, now);
    const timeRange = title.match(TIME_RANGE_REGEX)?.[0] ?? title.match(TIME_SINGLE_REGEX)?.[0] ?? null;

    classes.push({
      venue,
      title,
      details: "Google Form registration via Linktree",
      dayOfWeek: dateInfo.dayOfWeek,
      time: timeRange,
      startDate: dateInfo.startDate,
      endDate: dateInfo.endDate,
      bookingUrl,
      sourceUrl
    });
  });

  return Array.from(new Map(classes.map((item) => [`${item.bookingUrl}|${item.title}`, item])).values());
}

export async function scrapeCplayCyLinktree(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);

    return {
      venueKey: "cplayCy",
      venue,
      sourceUrl,
      classes: toClasses(html),
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "cplayCy",
      venue,
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
