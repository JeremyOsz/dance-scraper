import { format } from "date-fns";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl = "https://ruedalibre.co.uk/events/?ical=1";
const browserLikeHeaders = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
};

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

  const value = raw.replace(/^TZID=[^:]+:/, "").trim();
  if (/^\d{8}T\d{6}Z$/.test(value)) {
    return new Date(
      `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`
    );
  }
  if (/^\d{8}T\d{6}$/.test(value)) {
    return new Date(
      `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}`
    );
  }
  if (/^\d{8}$/.test(value)) {
    return new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00`);
  }
  return null;
}

function toTimeString(date: Date | null): string | null {
  if (!date) return null;
  return format(date, "HH:mm");
}

export async function scrapeCubaneando(): Promise<AdapterOutput> {
  try {
    const icsRaw = await fetchHtml(sourceUrl, browserLikeHeaders);
    const unfolded = icsRaw.replace(/\r\n[ \t]/g, "").replace(/\r/g, "\n");
    const blocks = unfolded.split("BEGIN:VEVENT").slice(1);

    const classes: AdapterOutput["classes"] = [];

    for (const block of blocks) {
      const eventBlock = block.split("END:VEVENT")[0] ?? "";
      const status = readField(eventBlock, "STATUS");
      if (status?.toUpperCase() === "CANCELLED") continue;

      const summary = decodeIcsText(readField(eventBlock, "SUMMARY"));
      const description = decodeIcsText(readField(eventBlock, "DESCRIPTION"));
      const location = decodeIcsText(readField(eventBlock, "LOCATION"));
      const bookingUrl = decodeIcsText(readField(eventBlock, "URL")) ?? sourceUrl;
      const sourceText = `${summary ?? ""} ${description ?? ""} ${location ?? ""}`;

      if (!summary || !bookingUrl) continue;
      if (!/cubaneando/i.test(sourceText)) continue;

      const start = parseIcsDate(readField(eventBlock, "DTSTART"));
      const end = parseIcsDate(readField(eventBlock, "DTEND"));

      classes.push({
        venue: "Cubaneando",
        title: summary,
        details: [location, description].filter(Boolean).join(" • ") || null,
        dayOfWeek: start ? format(start, "EEEE") : null,
        time: [toTimeString(start), toTimeString(end)].filter(Boolean).join(" - ") || null,
        startDate: start ? format(start, "yyyy-MM-dd") : null,
        endDate: start ? format(start, "yyyy-MM-dd") : null,
        bookingUrl,
        sourceUrl
      });
    }

    return {
      venueKey: "cubaneando",
      venue: "Cubaneando",
      sourceUrl,
      classes: Array.from(new Map(classes.map((item) => [item.title + item.startDate + item.bookingUrl, item])).values()),
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "cubaneando",
      venue: "Cubaneando",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
