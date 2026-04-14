import type { AdapterOutput, ScrapedClass } from "../types";
import { fetchJson } from "./common";

const LISTINGS_API = "https://api.gel.now/api/events/listings";

/** Public Gel listing search (kept in sync with the listings API query below). */
export const GEL_SEARCH_URL = "https://gel.now/?search=dance&category=workshop";

const SEARCH_PARAMS = {
  search: "dance",
  category: "workshop"
} as const;

const PAGE_LIMIT = 50;

type GelVenue = {
  name?: string;
  address?: string;
  city?: string;
};

type GelEvent = {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  description?: string;
  venues?: GelVenue[];
};

type GelListingsResponse = {
  events: GelEvent[];
  total_count: number;
};

function normalizeDetails(text: string | undefined): string | null {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  return t || null;
}

function venueLabel(event: GelEvent): string {
  const v = event.venues?.[0]?.name?.trim();
  if (v) return v;
  const addr = [event.venues?.[0]?.address, event.venues?.[0]?.city].filter(Boolean).join(", ");
  return addr || "Gel";
}

function formatLondonRange(
  startIso: string,
  endIso: string
): Pick<ScrapedClass, "dayOfWeek" | "time" | "startDate" | "endDate"> {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime())) {
    return { dayOfWeek: null, time: null, startDate: null, endDate: null };
  }

  const dayOfWeek = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "Europe/London" }).format(start);
  const startDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(start);
  const endDate = Number.isNaN(end.getTime())
    ? startDate
    : new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/London",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(end);

  const fmtTime = (d: Date) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).formatToParts(d);
    let hour = parts.find((p) => p.type === "hour")?.value ?? "";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "";
    const dayPeriod = (parts.find((p) => p.type === "dayPeriod")?.value ?? "").toLowerCase();
    if (hour === "0" || hour === "24") hour = "12";
    return `${hour}:${minute}${dayPeriod}`;
  };

  const time =
    !Number.isNaN(end.getTime()) && end.getTime() !== start.getTime()
      ? `${fmtTime(start)} - ${fmtTime(end)}`
      : fmtTime(start);

  return { dayOfWeek, time, startDate, endDate };
}

function toRow(event: GelEvent): ScrapedClass | null {
  const title = event.name?.trim();
  if (!title || !event.id) return null;

  const { dayOfWeek, time, startDate, endDate } = formatLondonRange(event.start_time, event.end_time);
  const bookingUrl = `https://gel.now/events/${event.id}`;

  return {
    venue: venueLabel(event),
    title,
    details: normalizeDetails(event.description),
    dayOfWeek,
    time,
    startDate,
    endDate,
    bookingUrl,
    sourceUrl: bookingUrl
  };
}

export async function scrapeGelNow(): Promise<AdapterOutput> {
  try {
    const params = new URLSearchParams({
      ...SEARCH_PARAMS,
      limit: String(PAGE_LIMIT)
    });

    const allEvents: GelEvent[] = [];
    let offset = 0;
    let totalCount = Infinity;

    while (offset < totalCount) {
      params.set("offset", String(offset));
      const url = `${LISTINGS_API}?${params.toString()}`;
      const data = await fetchJson<GelListingsResponse>(url);
      totalCount = data.total_count;
      if (data.events.length === 0) break;
      allEvents.push(...data.events);
      offset += data.events.length;
      if (allEvents.length >= totalCount) break;
    }

    const classes = allEvents.map(toRow).filter((row): row is ScrapedClass => row !== null);
    const uniqueVenues = [...new Set(classes.map((c) => c.venue))];

    return {
      venueKey: "gelNow",
      venue: "Gel",
      sourceUrl: GEL_SEARCH_URL,
      classes,
      ok: true,
      error: null,
      replacedVenueLabels: uniqueVenues
    };
  } catch (error) {
    return {
      venueKey: "gelNow",
      venue: "Gel",
      sourceUrl: GEL_SEARCH_URL,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
