import * as cheerio from "cheerio";
import type { AdapterOutput, ScrapedClass } from "../types";
import { absoluteUrl, fetchHtml } from "./common";

const sourceUrl = "https://www.tango-fever.com/classes-2/";
const calendarUrl = "https://tango-fever.punchpass.com/calendar?embed=true";

type JsonLdListItem = {
  item?: {
    "@type"?: string;
    name?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    url?: string;
    performer?: { name?: string };
    location?: { name?: string; address?: { addressLocality?: string; addressRegion?: string } };
  };
};

type JsonLdItemList = {
  "@type"?: string;
  itemListElement?: JsonLdListItem[];
};

const MONTH_INDEX_BY_NAME = new Map(
  [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december"
  ].map((name, index) => [name, index + 1])
);

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function datePart(value: string | undefined): string | null {
  return value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
}

function timePart(value: string | undefined): string | null {
  const match = value?.match(/T(\d{2}:\d{2})/);
  return match?.[1] ?? null;
}

function dayOfWeek(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "Europe/London" }).format(date);
}

function dayOfWeekFromDate(value: string): string | null {
  return dayOfWeek(`${value}T12:00:00+00:00`);
}

function parseJsonLdItemLists(html: string): JsonLdItemList[] {
  const $ = cheerio.load(html);
  const lists: JsonLdItemList[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;

    try {
      const parsed = JSON.parse(raw) as JsonLdItemList | { "@graph"?: JsonLdItemList[] };
      if ("@graph" in parsed && Array.isArray(parsed["@graph"])) {
        lists.push(...parsed["@graph"].filter((item) => item["@type"] === "ItemList"));
      } else if (parsed["@type"] === "ItemList") {
        lists.push(parsed);
      }
    } catch {
      // Ignore non-schedule JSON-LD blocks.
    }
  });

  return lists;
}

function jsonLdEvents(html: string): ScrapedClass[] {
  return parseJsonLdItemLists(html)
    .flatMap((list) => list.itemListElement ?? [])
    .map(toScrapedClass)
    .filter(isScrapedClass);
}

function enrichmentKey(title: string, startDate: string | null, startTime: string | null): string {
  return `${title.toLowerCase()}|${startDate ?? "na"}|${startTime ?? "na"}`;
}

function parseMonthHeading($: cheerio.CheerioAPI): { year: number; month: number } | null {
  const heading = normalizeText($(".page__heading h1").first().text());
  const match = heading.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;
  const month = MONTH_INDEX_BY_NAME.get(match[1].toLowerCase());
  if (!month) return null;
  return { year: Number(match[2]), month };
}

function parseCalendarCells(html: string, enrichedByKey: Map<string, ScrapedClass>): ScrapedClass[] {
  const $ = cheerio.load(html);
  const monthHeading = parseMonthHeading($);
  if (!monthHeading) return [];

  const classes: ScrapedClass[] = [];
  $(".calendar__week__day").each((_, cell) => {
    const root = $(cell);
    if (root.hasClass("calendar__week__day--notmonth")) return;

    const day = Number(normalizeText(root.find(".h3 strong").first().text()));
    if (!Number.isInteger(day) || day < 1 || day > 31) return;

    const startDate = [
      monthHeading.year,
      String(monthHeading.month).padStart(2, "0"),
      String(day).padStart(2, "0")
    ].join("-");
    root.find(".calendar__week__day__event").each((__, eventEl) => {
      const eventRoot = $(eventEl);
      const title = normalizeText(eventRoot.find(".calendar__week__day__event__details__classname").first().text());
      if (!title || !isClassLike(title)) return;

      const startTime = normalizeText(eventRoot.find(".calendar__week__day__event__details__hour").first().text()) || null;
      const enriched = enrichedByKey.get(enrichmentKey(title, startDate, startTime));
      const endTime = enriched?.time?.match(/ - (\d{2}:\d{2})$/)?.[1] ?? null;
      const textRows = eventRoot
        .find(".text--dark-gray")
        .toArray()
        .map((row) => normalizeText($(row).text()))
        .filter(Boolean);
      const location = textRows[0];
      const teacher = textRows[1];
      const description = enriched?.details?.replace(/\s+-\s+Teacher:.+$/i, "");
      const details = [
        description && description !== "X" ? description : null,
        location ? `Location: ${location}` : null,
        teacher ? `Teacher: ${teacher}` : null
      ]
        .filter(Boolean)
        .join(" - ");
      const href = absoluteUrl(calendarUrl, eventRoot.find("a.box[href]").first().attr("href")) ?? calendarUrl;

      classes.push({
        venue: "Tango Fever",
        title,
        details: details || null,
        dayOfWeek: dayOfWeekFromDate(startDate),
        time: startTime && endTime ? `${startTime} - ${endTime}` : startTime,
        startDate,
        endDate: startDate,
        bookingUrl: href,
        sourceUrl
      });
    });
  });

  return classes;
}

function isClassLike(title: string): boolean {
  if (/\bpass\b/i.test(title)) return false;
  return /(class|workshop|milonga|tango)/i.test(title);
}

function toScrapedClass(item: JsonLdListItem): ScrapedClass | null {
  const event = item.item;
  if (!event || event["@type"] !== "Event") return null;

  const title = normalizeText(event.name);
  if (!title || !isClassLike(title)) return null;

  const startDate = datePart(event.startDate);
  const endDate = datePart(event.endDate) ?? startDate;
  const startTime = timePart(event.startDate);
  const endTime = timePart(event.endDate);
  const time = startTime && endTime ? `${startTime} - ${endTime}` : startTime;
  const teacher = normalizeText(event.performer?.name);
  const description = normalizeText(event.description);
  const details = [description, teacher ? `Teacher: ${teacher}` : null].filter(Boolean).join(" - ");

  return {
    venue: "Tango Fever",
    title,
    details: details || null,
    dayOfWeek: dayOfWeek(event.startDate),
    time,
    startDate,
    endDate,
    bookingUrl: event.url ?? calendarUrl,
    sourceUrl
  };
}

function isScrapedClass(value: ScrapedClass | null): value is ScrapedClass {
  return value !== null;
}

function dedupe(classes: ScrapedClass[]): ScrapedClass[] {
  return Array.from(
    new Map(classes.map((item) => [`${item.title}|${item.startDate ?? "na"}|${item.time ?? "na"}`, item])).values()
  );
}

export async function scrapeTangoFever(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(calendarUrl);
    const enriched = jsonLdEvents(html);
    const enrichedByKey = new Map(
      enriched.map((item) => [
        enrichmentKey(item.title, item.startDate, item.time?.match(/^\d{2}:\d{2}/)?.[0] ?? null),
        item
      ])
    );
    const calendarClasses = parseCalendarCells(html, enrichedByKey);
    const classes = dedupe(calendarClasses.length > 0 ? calendarClasses : enriched);

    return {
      venueKey: "tangoFever",
      venue: "Tango Fever",
      sourceUrl,
      classes,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "tangoFever",
      venue: "Tango Fever",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
