import * as cheerio from "cheerio";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const sourceUrl =
  "https://www.outsavvy.com/event/32134/dance-movement-flow-workshop-experience?utm_source=ig&utm_medium=social&utm_content=link_in_bio";

function parseIsoDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDayOfWeek(date: Date | null): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "Europe/London" }).format(date);
}

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function formatTime(date: Date | null): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  })
    .format(date)
    .replace(/\s+/g, "")
    .toLowerCase();
}

function firstText(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const text = (value ?? "").replace(/\s+/g, " ").trim();
    if (text) return text;
  }
  return null;
}

export async function scrapeAdrianOutsavvy(): Promise<AdapterOutput> {
  try {
    const html = await fetchHtml(sourceUrl);
    const $ = cheerio.load(html);

    let event: Record<string, unknown> | null = null;
    $("script[type='application/ld+json']").each((_, element) => {
      if (event) return;
      const raw = $(element).html();
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          event = parsed.find((item) => (item as { "@type"?: string })?.["@type"] === "Event") as Record<string, unknown> | null;
          return;
        }
        if (typeof parsed === "object" && parsed !== null) {
          const typed = parsed as { "@type"?: string; "@graph"?: unknown[] };
          if (typed["@type"] === "Event") {
            event = parsed as Record<string, unknown>;
            return;
          }
          if (Array.isArray(typed["@graph"])) {
            event = typed["@graph"].find((item) => (item as { "@type"?: string })?.["@type"] === "Event") as Record<string, unknown> | null;
          }
        }
      } catch {
        // Ignore malformed JSON-LD blocks.
      }
    });

    const start = parseIsoDate((event?.startDate as string | undefined) ?? undefined);
    const end = parseIsoDate((event?.endDate as string | undefined) ?? undefined);
    const startText = formatTime(start);
    const endText = formatTime(end);
    const time = startText && endText ? `${startText} - ${endText}` : startText;

    const title = firstText([
      (event?.name as string | undefined) ?? undefined,
      $("h1").first().text()
    ]);
    const details = firstText([
      (event?.description as string | undefined) ?? undefined,
      $("meta[name='description']").attr("content")
    ]);

    if (!title) {
      return {
        venueKey: "adrianOutsavvy",
        venue: "Adrian (Outsavvy)",
        sourceUrl,
        classes: [],
        ok: true,
        error: null
      };
    }

    return {
      venueKey: "adrianOutsavvy",
      venue: "Adrian (Outsavvy)",
      sourceUrl,
      classes: [
        {
          venue: "Adrian (Outsavvy)",
          title,
          details,
          dayOfWeek: formatDayOfWeek(start),
          time,
          startDate: formatDate(start),
          endDate: formatDate(end ?? start),
          bookingUrl: sourceUrl,
          sourceUrl
        }
      ],
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "adrianOutsavvy",
      venue: "Adrian (Outsavvy)",
      sourceUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
