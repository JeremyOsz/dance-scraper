import fs from "node:fs";
import path from "node:path";
import type { AdapterOutput, ScrapedClass } from "../types";

const DATA_FILE = path.join(process.cwd(), "data", "custom-events.json");

type CustomEventEntry = {
  title: string;
  details?: string | null;
  dayOfWeek?: string | null;
  time?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  bookingUrl: string;
  sourceUrl?: string | null;
};

type CustomEventsFile = {
  venue: string;
  sourceUrl: string;
  events: CustomEventEntry[];
};

function readCustomEvents(): CustomEventsFile {
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw) as CustomEventsFile;
  if (!parsed.venue?.trim() || !parsed.sourceUrl?.trim() || !Array.isArray(parsed.events)) {
    throw new Error("custom-events.json must include venue, sourceUrl, and events[]");
  }
  return parsed;
}

function toRow(entry: CustomEventEntry, venue: string, fallbackSourceUrl: string): ScrapedClass | null {
  const title = entry.title?.trim();
  const bookingUrl = entry.bookingUrl?.trim();
  if (!title || !bookingUrl) return null;

  return {
    venue,
    title,
    details: entry.details?.trim() || null,
    dayOfWeek: entry.dayOfWeek?.trim() || null,
    time: entry.time?.trim() || null,
    startDate: entry.startDate?.trim() || null,
    endDate: entry.endDate?.trim() || null,
    bookingUrl,
    sourceUrl: entry.sourceUrl?.trim() || fallbackSourceUrl
  };
}

export async function scrapeCustomEvents(): Promise<AdapterOutput> {
  try {
    const file = readCustomEvents();
    const venue = file.venue.trim();
    const classes: ScrapedClass[] = [];

    for (const entry of file.events) {
      const row = toRow(entry, venue, file.sourceUrl);
      if (row) classes.push(row);
    }

    return {
      venueKey: "customEvents",
      venue,
      sourceUrl: file.sourceUrl,
      classes,
      ok: true,
      error: null
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      venueKey: "customEvents",
      venue: "Custom listings",
      sourceUrl: "https://www.jw3.org.uk/whats-on",
      classes: [],
      ok: false,
      error: message
    };
  }
}
