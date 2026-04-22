import * as cheerio from "cheerio";
import type { AdapterOutput, ScrapedClass } from "../types";
import { fetchJson } from "./common";

const sourceUrl = "https://www.colethouse.org/whats-on";
const widgetId = "b32601c9-0ce7-48c2-bf2d-c3ee5f9c172f";
const bootUrl = `https://core.service.elfsight.com/p/boot/?w=${widgetId}&page=${encodeURIComponent(sourceUrl)}`;

type ElfsightBoot = {
  status?: number;
  data?: {
    widgets?: Record<
      string,
      {
        status?: number;
        data?: {
          settings?: {
            events?: ElfsightEvent[];
            eventTypes?: Array<{ id?: string; name?: string }>;
            locations?: Array<{ id?: string; name?: string; address?: string }>;
          };
        };
      }
    >;
  };
};

type ElfsightEvent = {
  name?: string;
  description?: string;
  start?: { date?: string; time?: string };
  end?: { date?: string; time?: string };
  eventType?: string[];
  location?: string[];
  repeatWeeklyOnDays?: string[];
  repeatEndsDate?: { date?: string } | null;
  buttonLink?: { value?: string; rawValue?: string } | null;
};

const weekdayByCode: Record<string, string> = {
  mo: "Monday",
  tu: "Tuesday",
  we: "Wednesday",
  th: "Thursday",
  fr: "Friday",
  sa: "Saturday",
  su: "Sunday"
};

function htmlToText(input: string | undefined): string | null {
  if (!input) return null;
  const text = cheerio.load(`<div>${input}</div>`)("div").text().replace(/\s+/g, " ").trim();
  return text || null;
}

function formatTimeRange(start: string | undefined, end: string | undefined): string | null {
  const startTime = start?.trim();
  const endTime = end?.trim();
  if (startTime && endTime) {
    if (startTime === endTime) return startTime;
    return `${startTime} - ${endTime}`;
  }
  return startTime || endTime || null;
}

function normalizeEndDate(startDate: string | null, endDate: string | null): string | null {
  if (!startDate || !endDate) return endDate;
  if (endDate < startDate) return null;
  return endDate;
}

function inferDayOfWeek(weeklyDays: string[] | undefined, startDate: string | null): string | null {
  const fromWeekly = weeklyDays?.map((code) => weekdayByCode[code.toLowerCase()]).find(Boolean) ?? null;
  if (fromWeekly) return fromWeekly;
  if (!startDate) return null;

  const parsed = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-GB", { weekday: "long", timeZone: "Europe/London" });
}

function dedupe(classes: ScrapedClass[]): ScrapedClass[] {
  return Array.from(
    new Map(
      classes.map((item) => [`${item.title}|${item.dayOfWeek ?? "na"}|${item.startDate ?? "na"}|${item.time ?? "na"}`, item])
    ).values()
  );
}

export async function scrapeColetHouse(): Promise<AdapterOutput> {
  try {
    const payload = await fetchJson<ElfsightBoot>(bootUrl);
    const widget = payload.data?.widgets?.[widgetId];
    const settings = widget?.data?.settings;
    const events = settings?.events ?? [];
    const eventTypes = settings?.eventTypes ?? [];
    const locations = settings?.locations ?? [];

    const classTypeIds = new Set(
      eventTypes.filter((entry) => (entry.name ?? "").trim().toLowerCase() === "classes").map((entry) => entry.id).filter(Boolean)
    );
    const coletLocationIds = new Set(
      locations.filter((entry) => (entry.name ?? "").toLowerCase().includes("colet house")).map((entry) => entry.id).filter(Boolean)
    );
    const locationById = new Map(locations.map((entry) => [entry.id, entry]).filter((entry): entry is [string, NonNullable<typeof entry[1]>] => Boolean(entry[0])));

    const classes: ScrapedClass[] = [];
    for (const event of events) {
      const typeIds = event.eventType ?? [];
      const locationIds = event.location ?? [];
      if (!typeIds.some((id) => classTypeIds.has(id)) || !locationIds.some((id) => coletLocationIds.has(id))) {
        continue;
      }

      const title = event.name?.trim();
      if (!title) continue;

      const startDate = event.start?.date?.trim() || null;
      const endDate = normalizeEndDate(startDate, event.repeatEndsDate?.date?.trim() || null);
      const dayOfWeek = inferDayOfWeek(event.repeatWeeklyOnDays, startDate);
      const time = formatTimeRange(event.start?.time, event.end?.time);
      const locationLabel = locationIds
        .map((id) => locationById.get(id))
        .filter(Boolean)
        .map((location) => [location?.name?.trim(), location?.address?.trim()].filter(Boolean).join(", "))
        .find(Boolean);
      const details = [locationLabel, htmlToText(event.description)].filter(Boolean).join(" • ") || null;
      const bookingUrl = event.buttonLink?.value?.trim() || event.buttonLink?.rawValue?.trim() || sourceUrl;

      classes.push({
        venue: "Colet House",
        title,
        details,
        dayOfWeek,
        time,
        startDate,
        endDate,
        bookingUrl,
        sourceUrl
      });
    }

    return {
      venueKey: "coletHouse",
      venue: "Colet House",
      sourceUrl,
      classes: dedupe(classes),
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "coletHouse",
      venue: "Colet House",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
