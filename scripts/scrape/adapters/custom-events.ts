import fs from "node:fs";
import path from "node:path";
import type { AdapterOutput, ScrapedClass } from "../types";
import { fetchHtml } from "./common";
import { browserLikeHeaders, scrapeTicketTailorOrganizerHtml } from "./ticket-tailor";

const DATA_FILE = path.join(process.cwd(), "data", "custom-events.json");

type CustomEventEntry = {
  title: string;
  /** Overrides top-level `venue` for this row (e.g. a different theatre). */
  venue?: string | null;
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
  ticketTailorOrganizers?: {
    venue: string;
    organizerUrl: string;
    titlePattern?: string | null;
    fallbackTitle?: string | null;
    fallbackDetails?: string | null;
    defaultDetails?: string | null;
  }[];
};

function readCustomEvents(): CustomEventsFile {
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw) as CustomEventsFile;
  if (!parsed.venue?.trim() || !parsed.sourceUrl?.trim() || !Array.isArray(parsed.events)) {
    throw new Error("custom-events.json must include venue, sourceUrl, and events[]");
  }
  return parsed;
}

function collectReplacedVenueLabels(file: CustomEventsFile): string[] {
  const defaultVenue = file.venue.trim();
  const labels = new Set<string>();
  if (defaultVenue) labels.add(defaultVenue);
  for (const entry of file.events) {
    const v = entry.venue?.trim() || defaultVenue;
    if (v) labels.add(v);
  }
  for (const organizer of file.ticketTailorOrganizers ?? []) {
    const venue = organizer.venue?.trim();
    if (venue) labels.add(venue);
  }
  return [...labels];
}

function toRow(entry: CustomEventEntry, defaultVenue: string, fallbackSourceUrl: string): ScrapedClass | null {
  const title = entry.title?.trim();
  const bookingUrl = entry.bookingUrl?.trim();
  if (!title || !bookingUrl) return null;

  const venue = (entry.venue?.trim() || defaultVenue).trim();
  if (!venue) return null;

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

function dedupeClasses(classes: ScrapedClass[]) {
  return Array.from(
    new Map(
      classes.map((row) => [
        `${row.venue}|${row.title.toLowerCase()}|${row.startDate ?? "open"}|${row.endDate ?? "open"}|${row.time ?? "time-tbc"}`,
        row
      ])
    ).values()
  );
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

    for (const organizer of file.ticketTailorOrganizers ?? []) {
      const organizerUrl = organizer.organizerUrl?.trim();
      const organizerVenue = organizer.venue?.trim();
      if (!organizerUrl || !organizerVenue) {
        continue;
      }

      let scrapedAny = false;
      try {
        const html = await fetchHtml(organizerUrl, browserLikeHeaders);
        const scraped = scrapeTicketTailorOrganizerHtml(html, {
          venue: organizerVenue,
          organizerUrl,
          titlePattern: organizer.titlePattern ?? null,
          defaultDetails: organizer.defaultDetails ?? null
        });
        if (scraped.length > 0) {
          classes.push(...scraped);
          scrapedAny = true;
        }
      } catch {
        // Fall through to optional fallback record.
      }

      if (!scrapedAny && organizer.fallbackTitle?.trim()) {
        const fallback = toRow(
          {
            title: organizer.fallbackTitle,
            venue: organizerVenue,
            details: organizer.fallbackDetails ?? null,
            bookingUrl: organizerUrl,
            sourceUrl: organizerUrl
          },
          venue,
          file.sourceUrl
        );
        if (fallback) {
          classes.push(fallback);
        }
      }
    }

    return {
      venueKey: "customEvents",
      venue,
      sourceUrl: file.sourceUrl,
      classes: dedupeClasses(classes),
      ok: true,
      error: null,
      replacedVenueLabels: collectReplacedVenueLabels(file)
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
