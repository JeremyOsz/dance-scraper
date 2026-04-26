import * as cheerio from "cheerio";
import { format, parseISO } from "date-fns";
import type { AdapterOutput, ScrapedClass } from "../types";
import { fetchHtml, fetchJson } from "./common";

const venue = "East London Dance";
const sourceUrl =
  "https://goteamup.com/w5799650/p/5799650-east-london-dance/c/schedule?url=list&view=schedule.day&venue=43266&disableVenueSelector=1";
const apiUrl = "https://goteamup.com/api/v2/events";
const venueId = 43266;
const DAY_REGEX = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?\b/i;
const TIME_REGEX = /\b\d{1,2}(?::\d{2})?\s*[ap]m?\s*(?:-|–|—|to)\s*\d{1,2}(?::\d{2})?\s*[ap]m?\b/i;

type TeamUpSessionData = {
  access_token?: string;
};

type TeamUpEventsResponse = {
  next: string | null;
  results?: Array<{
    name?: string;
    description?: string | null;
    starts_at?: string;
    ends_at?: string;
    customer_url?: string | null;
    venue?: number | null;
    status?: string | null;
  }>;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function decodeSessionData(html: string): TeamUpSessionData | null {
  const match = html.match(/TEAMUP_USER_SESSION_DATA\s*=\s*JSON\.parse\("([\s\S]*?)"\);/);
  if (!match) {
    return null;
  }

  try {
    const escapedPayload = match[1];
    const decodedJsonString = JSON.parse(`"${escapedPayload}"`) as string;
    return JSON.parse(decodedJsonString) as TeamUpSessionData;
  } catch {
    return null;
  }
}

function toText(html: string | null | undefined): string {
  if (!html) return "";
  const $ = cheerio.load(`<div>${html}</div>`);
  return normalizeText($.text());
}

function isDatedOneOffEvent(title: string, descriptionText: string): boolean {
  return /\btaster\b/i.test(`${title} ${descriptionText}`);
}

function toIsoDate(value: Date | null): string | null {
  return value && !Number.isNaN(value.getTime()) ? format(value, "yyyy-MM-dd") : null;
}

function removeRedundantBookingOptions(classes: ScrapedClass[]): ScrapedClass[] {
  const hasSpecificKrumpOptions = classes.some((item) => item.title === "Krump (Class & Jam)" || item.title === "Krump (Jam)");
  if (!hasSpecificKrumpOptions) {
    return classes;
  }

  return classes.filter((item) => item.title !== "Krump");
}

function parseClassesFromEvents(events: NonNullable<TeamUpEventsResponse["results"]>): ScrapedClass[] {
  const classes: ScrapedClass[] = [];
  const todayIso = format(new Date(), "yyyy-MM-dd");

  for (const event of events) {
    const title = normalizeText(event.name);
    if (!title || event.status === "cancelled") continue;
    if (event.venue && event.venue !== venueId) continue;

    const descriptionText = toText(event.description);
    const start = event.starts_at ? parseISO(event.starts_at) : null;
    const end = event.ends_at ? parseISO(event.ends_at) : null;
    const isOneOff = isDatedOneOffEvent(title, descriptionText);
    const startDate = isOneOff ? toIsoDate(start) : null;
    const endDate = isOneOff ? toIsoDate(end) ?? startDate : null;
    if (isOneOff && (endDate ?? startDate) && (endDate ?? startDate)! < todayIso) {
      continue;
    }

    const dayOfWeek = descriptionText.match(DAY_REGEX)?.[1] ?? (start && !Number.isNaN(start.getTime()) ? format(start, "EEEE") : null);
    const time =
      descriptionText.match(TIME_REGEX)?.[0] ??
      (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
        ? `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`
        : null);
    const bookingUrl = event.customer_url ? new URL(event.customer_url, "https://goteamup.com").toString() : sourceUrl;

    classes.push({
      venue,
      title,
      details: descriptionText || null,
      dayOfWeek,
      time,
      startDate,
      endDate,
      bookingUrl,
      sourceUrl
    });
  }

  const dedupedClasses = Array.from(new Map(classes.map((item) => [`${item.title}|${item.dayOfWeek ?? "na"}|${item.time ?? "na"}`, item])).values());
  return removeRedundantBookingOptions(dedupedClasses);
}

async function fetchAllEvents(accessToken: string): Promise<NonNullable<TeamUpEventsResponse["results"]>> {
  const events: NonNullable<TeamUpEventsResponse["results"]> = [];
  let nextUrl: string | null = `${apiUrl}?page_size=100&venue=${venueId}`;
  let pages = 0;

  while (nextUrl && pages < 30) {
    const response: TeamUpEventsResponse = await fetchJson(nextUrl, {
      Authorization: `Token ${accessToken}`
    });
    events.push(...(response.results ?? []));
    nextUrl = response.next;
    pages += 1;
  }

  return events;
}

export async function scrapeEastLondonDance(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);
    const sessionData = decodeSessionData(html);
    const accessToken = sessionData?.access_token;

    if (!accessToken) {
      throw new Error("Unable to read TeamUp access token");
    }

    const events = await fetchAllEvents(accessToken);
    const classes = parseClassesFromEvents(events);

    return {
      venueKey: "eastLondonDance",
      venue,
      sourceUrl,
      classes,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "eastLondonDance",
      venue,
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
