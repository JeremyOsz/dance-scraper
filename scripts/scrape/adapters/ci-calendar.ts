import { format } from "date-fns";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://cicalendar.uk/london";

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function readField(block: string, key: string): string | null {
  const re = new RegExp(`(?:^|\\n)${key}(?:;[^:]+)?:([^\\n\\r]+)`, "i");
  const match = block.match(re);
  return match?.[1]?.trim() ?? null;
}

function decodeIcsText(input: string | null): string | null {
  if (!input) return null;
  return input
    .replace(/\\n/g, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .replace(/\s+/g, " ")
    .trim();
}

function parseIcsDate(raw: string | null): Date | null {
  if (!raw) return null;
  if (/^\d{8}$/.test(raw)) {
    return new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T00:00:00`);
  }
  if (/^\d{8}T\d{6}Z$/.test(raw)) {
    return new Date(
      `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(9, 11)}:${raw.slice(11, 13)}:${raw.slice(13, 15)}Z`
    );
  }
  if (/^\d{8}T\d{6}$/.test(raw)) {
    return new Date(
      `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(9, 11)}:${raw.slice(11, 13)}:${raw.slice(13, 15)}`
    );
  }
  return null;
}

function toTimeString(date: Date | null): string | null {
  if (!date) return null;
  return format(date, "HH:mm");
}

export async function scrapeCiCalendarLondon(): Promise<AdapterOutput> {
  try {
    const page = await fetchHtml(sourceUrl);
    const feedPaths = unique(page.match(/\/feeds\/[a-z0-9.-]+\.ics/gi) ?? []);
    const feedUrls = feedPaths.map((path) => new URL(path, sourceUrl).toString());

    const classes: AdapterOutput["classes"] = [];

    for (const feedUrl of feedUrls) {
      const icsRaw = await fetchHtml(feedUrl);
      const unfolded = icsRaw.replace(/\r\n[ \t]/g, "").replace(/\r/g, "\n");
      const blocks = unfolded.split("BEGIN:VEVENT").slice(1);

      for (const block of blocks) {
        const eventBlock = block.split("END:VEVENT")[0] ?? "";
        const status = readField(eventBlock, "STATUS");
        if (status?.toUpperCase() === "CANCELLED") {
          continue;
        }

        const title = decodeIcsText(readField(eventBlock, "SUMMARY"));
        const bookingUrl = decodeIcsText(readField(eventBlock, "URL")) ?? feedUrl;
        if (!title || !bookingUrl) {
          continue;
        }

        const start = parseIcsDate(readField(eventBlock, "DTSTART"));
        const end = parseIcsDate(readField(eventBlock, "DTEND"));
        const description = decodeIcsText(readField(eventBlock, "DESCRIPTION"));
        const location = decodeIcsText(readField(eventBlock, "LOCATION"));

        classes.push({
          venue: "CI Calendar London",
          title,
          details: [location, description].filter(Boolean).join(" • ") || null,
          dayOfWeek: start ? format(start, "EEEE") : null,
          time: [toTimeString(start), toTimeString(end)].filter(Boolean).join(" - ") || null,
          startDate: start ? format(start, "yyyy-MM-dd") : null,
          endDate: start ? format(start, "yyyy-MM-dd") : null,
          bookingUrl,
          sourceUrl: feedUrl
        });
      }
    }

    return {
      venueKey: "ciCalendarLondon",
      venue: "CI Calendar London",
      sourceUrl,
      classes: Array.from(new Map(classes.map((c) => [c.title + c.bookingUrl + c.startDate, c])).values()),
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "ciCalendarLondon",
      venue: "CI Calendar London",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
