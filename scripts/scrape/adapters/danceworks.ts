import { format, isValid, parseISO } from "date-fns";
import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { AdapterOutput, ScrapedClass } from "../types";
import { absoluteUrl, fetchHtml, fetchJson } from "./common";

const sourceUrl = "https://www.danceworks.com/london/classes/timetable/";
const mindbodyWidgetFallbackId = "2314186103cf";
const mindbodyLoadMarkupBaseUrl = "https://widgets.mindbodyonline.com/widgets/schedules";
const DAY_REGEX = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i;

type MindbodyLoadMarkupResponse = {
  class_sessions?: string;
};

function normalizeText(value: string | null | undefined): string | null {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  return normalized || null;
}

function londonDateISO(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return format(new Date(), "yyyy-MM-dd");
  }

  return `${year}-${month}-${day}`;
}

function parseIsoDate(datetime: string | null): string | null {
  if (!datetime) return null;
  const match = datetime.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function inferDayOfWeek(startDate: string | null, dayLabel: string | null): string | null {
  if (dayLabel) {
    const match = dayLabel.match(DAY_REGEX);
    if (match?.[1]) {
      return match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
    }
  }
  if (!startDate) return null;
  const parsed = parseISO(startDate);
  if (!isValid(parsed)) return null;
  return format(parsed, "EEEE");
}

function parseWidgetId(pageHtml: string): string {
  const $ = cheerio.load(pageHtml);
  const widgetId = normalizeText($('healcode-widget[data-type="schedules"]').first().attr("data-widget-id"));
  return widgetId ?? mindbodyWidgetFallbackId;
}

function toDetails(root: cheerio.Cheerio<AnyNode>): string | null {
  const instructor = normalizeText(root.find(".bw-session__staff").first().text());
  const level = normalizeText(root.find(".bw-session__level").first().text());
  const location = normalizeText(root.find(".bw-session__location").first().text());
  const room = normalizeText(root.find(".bw-session__room").first().text())?.replace(/^Room:\s*/i, "") ?? null;
  const description =
    normalizeText(root.find(".bw-session__description > div").first().text()) ??
    normalizeText(root.find(".bw-session__description").first().text());

  const parts = [
    instructor ? `Instructor: ${instructor}` : null,
    level ? `Level: ${level}` : null,
    room ? `Room: ${room}` : null,
    location ? `Location: ${location}` : null,
    description
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" | ") : null;
}

function parseSession(
  $: cheerio.CheerioAPI,
  element: AnyNode,
  dayLabel: string | null,
  venue: string,
  source: string
): ScrapedClass | null {
  const root = $(element);
  const title = normalizeText(root.find(".bw-session__name").first().text());
  if (!title) return null;

  const startDate = parseIsoDate(normalizeText(root.find("time.hc_starttime").first().attr("datetime")));
  const endDate = parseIsoDate(normalizeText(root.find("time.hc_endtime").first().attr("datetime"))) ?? startDate;

  const startTime = normalizeText(root.find("time.hc_starttime").first().text());
  const endTime = normalizeText(root.find("time.hc_endtime").first().text());
  const time = startTime && endTime ? `${startTime} - ${endTime}` : startTime;

  const bookingHref =
    normalizeText(root.find(".bw-widget__cta").first().attr("data-url")) ??
    normalizeText(root.find("a[href]").first().attr("href"));
  const bookingUrl = absoluteUrl(source, bookingHref ?? undefined) ?? source;

  return {
    venue,
    title,
    details: toDetails(root),
    dayOfWeek: inferDayOfWeek(startDate, dayLabel),
    time,
    startDate,
    endDate,
    bookingUrl,
    sourceUrl: source
  };
}

function dedupe(classes: ScrapedClass[]): ScrapedClass[] {
  return Array.from(
    new Map(
      classes.map((item) => [`${item.title}|${item.startDate ?? "na"}|${item.time ?? "na"}|${item.bookingUrl}`, item])
    ).values()
  );
}

function parseClassSessions(markup: string, venue: string, source: string): ScrapedClass[] {
  const $ = cheerio.load(markup);
  const classes: ScrapedClass[] = [];

  $(".bw-widget__day").each((_, dayElement) => {
    const day = $(dayElement);
    const dayLabel = normalizeText(day.find(".bw-widget__date").first().text());
    day.find(".bw-session").each((__, sessionElement) => {
      const parsed = parseSession($, sessionElement, dayLabel, venue, source);
      if (parsed) classes.push(parsed);
    });
  });

  if (classes.length === 0) {
    $(".bw-session").each((_, sessionElement) => {
      const parsed = parseSession($, sessionElement, null, venue, source);
      if (parsed) classes.push(parsed);
    });
  }

  return dedupe(classes);
}

export async function scrapeDanceworks(): Promise<AdapterOutput> {
  try {
    const pageHtml = await fetchHtml(sourceUrl);
    const widgetId = parseWidgetId(pageHtml);
    const params = new URLSearchParams({
      "options[start_date]": londonDateISO()
    });
    const url = `${mindbodyLoadMarkupBaseUrl}/${widgetId}/load_markup?${params.toString()}`;
    const payload = await fetchJson<MindbodyLoadMarkupResponse>(url);
    const classSessions = typeof payload.class_sessions === "string" ? payload.class_sessions : "";

    return {
      venueKey: "danceworks",
      venue: "Danceworks",
      sourceUrl,
      classes: classSessions ? parseClassSessions(classSessions, "Danceworks", sourceUrl) : [],
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "danceworks",
      venue: "Danceworks",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
