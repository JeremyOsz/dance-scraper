import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { AdapterOutput, ScrapedClass } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://www.londonschoolofcapoeira.com/timetable";
const beginnerCourseUrl = "https://www.londonschoolofcapoeira.com/courses-and-products/p/beginners-course";
const venue = "London School of Capoeira Herança";
const SCHEDULE_PATTERN = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(.+)$/i;
const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function isScheduleHeading(text: string): RegExpMatchArray | null {
  const match = text.match(SCHEDULE_PATTERN);
  if (!match || !/\d{1,2}(?::\d{2})?\s*(?:-|–|—|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)/i.test(match[2])) return null;
  return match;
}

function followingDetails($: cheerio.CheerioAPI, heading: AnyNode): string | null {
  const text = normalizeText($(heading).nextUntil("h2, h3").text());
  return text || null;
}

function parseTimetable(html: string): ScrapedClass[] {
  const $ = cheerio.load(html);
  const classes: ScrapedClass[] = [];
  let schedule: { dayOfWeek: string; time: string } | null = null;

  $(".sqs-html-content h2, .sqs-html-content h3").each((_, heading) => {
    const text = normalizeText($(heading).text());
    const scheduleMatch = isScheduleHeading(text);
    if (scheduleMatch) {
      schedule = { dayOfWeek: scheduleMatch[1], time: scheduleMatch[2] };
      return;
    }
    if (!schedule || !text) return;

    const current = schedule;
    schedule = null;
    if (/^Capoeira Music$/i.test(text) || /^Beginners['’]? Capoeira Course$/i.test(text)) return;
    if (!/capoeira|roda/i.test(text)) return;
    classes.push({
      venue,
      title: text,
      details: followingDetails($, heading),
      dayOfWeek: current.dayOfWeek,
      time: current.time,
      startDate: null,
      endDate: null,
      isCourse: false,
      bookingUrl: sourceUrl,
      sourceUrl
    });
  });

  return classes;
}

function isoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function inferYear(month: number, now: Date): number {
  const currentMonth = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", month: "numeric" }).format(now));
  const currentYear = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric" }).format(now));
  return month < currentMonth - 1 ? currentYear + 1 : currentYear;
}

function dayOfWeek(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "Europe/London" }).format(
    new Date(`${date}T12:00:00Z`)
  );
}

function courseTime(details: string): string | null {
  const match = details.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|–|—|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i);
  if (!match) return null;
  const meridiem = match[2].match(/(am|pm)/i)?.[1].toLowerCase() ?? "";
  const start = /(?:am|pm)/i.test(match[1]) ? match[1] : `${match[1]}${meridiem}`;
  return `${start.replace(/\s+/g, "")} - ${match[2].replace(/\s+/g, "")}`;
}

function parseBeginnerCourse(html: string, now: Date): ScrapedClass[] {
  const $ = cheerio.load(html);
  const title = normalizeText($("h1.product-title, h1").first().text());
  const description = $(".product-description").first();
  const detailRoot = description.length > 0 ? description : $("main").first();
  const paragraphs = detailRoot.find("p").toArray().map((node) => normalizeText($(node).text())).filter(Boolean);
  const details = paragraphs.length > 0 ? paragraphs.join(" • ") : normalizeText(detailRoot.text());
  const nextCourse = details.match(/Next Course:\s*(.*?)\s+of\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/i);
  const time = courseTime(details);
  if (!title || !nextCourse || !time) return [];

  const month = MONTHS[nextCourse[2].toLowerCase()];
  const year = inferYear(month, now);
  const days = Array.from(nextCourse[1].matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\b/gi)).map((match) => Number(match[1]));
  return Array.from(new Set(days)).flatMap((day): ScrapedClass[] => {
    const date = isoDate(year, month, day);
    if (!date) return [];
    return [{
      venue,
      title,
      details: details || null,
      dayOfWeek: dayOfWeek(date),
      time,
      startDate: date,
      endDate: date,
      isCourse: true,
      bookingUrl: beginnerCourseUrl,
      sourceUrl
    }];
  });
}

export async function scrapeLondonSchoolOfCapoeira(): Promise<AdapterOutput> {
  try {
    const timetableHtml = await fetchHtml(sourceUrl);
    const classes = parseTimetable(timetableHtml);
    try {
      const courseHtml = await fetchHtml(beginnerCourseUrl);
      classes.push(...parseBeginnerCourse(courseHtml, new Date()));
    } catch {
      // The weekly timetable remains useful if the store product is temporarily unavailable.
    }
    return { venueKey: "londonSchoolOfCapoeira", venue, sourceUrl, classes, ok: true, error: null };
  } catch (error) {
    return {
      venueKey: "londonSchoolOfCapoeira",
      venue,
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
