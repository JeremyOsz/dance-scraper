import { addMonths, format, isValid, parseISO } from "date-fns";
import type { AdapterOutput } from "../types";
import { fetchHtml } from "./common";

const supabaseRpcUrl = "https://stsdtacfauprzrdebmzg.supabase.co/rest/v1/rpc/get_calendar_events_v2";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0c2R0YWNmYXVwcnpyZGVibXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMjAwODEsImV4cCI6MjA4MDU5NjA4MX0.16NNYdrWeTtl3_AylxmOLK6Vrxf7SEGsZIwMSrJl3OQ";
const sourceCalendarUrl = "https://bachatacommunity.space/london-gb/calendar";
type SupabaseCalendarEvent = {
  event_id: string;
  name: string;
  location: string | null;
  instance_date: string | null;
  occurrence_starts_at: string | null;
  occurrence_ends_at: string | null;
  start_time?: string | null;
  end_time?: string | null;
  city_slug?: string | null;
};

function parseSupabaseEvents(raw: string): SupabaseCalendarEvent[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      event_id: String(item.event_id ?? ""),
      name: String(item.name ?? ""),
      location: item.location ? String(item.location) : null,
      instance_date: item.instance_date ? String(item.instance_date) : null,
      occurrence_starts_at: item.occurrence_starts_at ? String(item.occurrence_starts_at) : null,
      occurrence_ends_at: item.occurrence_ends_at ? String(item.occurrence_ends_at) : null,
      start_time: item.start_time ? String(item.start_time) : null,
      end_time: item.end_time ? String(item.end_time) : null,
      city_slug: item.city_slug ? String(item.city_slug) : null
    }))
    .filter((item) => Boolean(item.event_id && item.name));
}

function formatTimeRange(startIso: string | null, endIso: string | null): string | null {
  if (!startIso && !endIso) return null;
  const start = startIso ? parseISO(startIso) : null;
  const end = endIso ? parseISO(endIso) : null;
  const startLabel = start && isValid(start) ? format(start, "HH:mm") : null;
  const endLabel = end && isValid(end) ? format(end, "HH:mm") : null;
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  return startLabel ?? endLabel;
}

async function fetchBachataFromSupabase(anchorDate: Date): Promise<AdapterOutput["classes"]> {
  const rangeStart = new Date(anchorDate);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = addMonths(rangeStart, 2);
  rangeEnd.setHours(23, 59, 59, 999);

  const endpoint =
    `${supabaseRpcUrl}?` +
    `range_start=${encodeURIComponent(rangeStart.toISOString())}` +
    `&range_end=${encodeURIComponent(rangeEnd.toISOString())}` +
    `&city_slug_param=london-gb`;
  const raw = await fetchHtml(endpoint, {
    Accept: "application/json",
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`
  });
  const events = parseSupabaseEvents(raw);
  const classes: AdapterOutput["classes"] = [];

  for (const event of events) {
    const dateIso = event.instance_date && /^\d{4}-\d{2}-\d{2}$/.test(event.instance_date) ? event.instance_date : null;
    const dayOfWeek = dateIso ? format(parseISO(dateIso), "EEEE") : null;
    const startsAt = event.occurrence_starts_at ?? event.start_time ?? null;
    const endsAt = event.occurrence_ends_at ?? event.end_time ?? null;
    classes.push({
      venue: "Bachata Community",
      title: normalizeTitle(event.name),
      details: [stripHtml(event.location), "Bachata Calendar (London)"].filter(Boolean).join(" • ") || null,
      dayOfWeek,
      time: formatTimeRange(startsAt, endsAt),
      startDate: dateIso,
      endDate: dateIso,
      bookingUrl: `https://bachatacommunity.space/event/${event.event_id}`,
      sourceUrl: sourceCalendarUrl
    });
  }

  return Array.from(new Map(classes.map((c) => [c.title + c.startDate + c.bookingUrl, c])).values());
}

function stripHtml(input: string | null | undefined): string | null {
  if (!input) return null;
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(title: string): string {
  return title.replace(/[\u{1F300}-\u{1FAFF}]/gu, "").replace(/\s+/g, " ").trim();
}

export async function scrapeBachataCommunity(): Promise<AdapterOutput> {
  try {
    const classes = await fetchBachataFromSupabase(new Date());
    return {
      venueKey: "bachataCommunity",
      venue: "Bachata Community",
      sourceUrl: sourceCalendarUrl,
      classes,
      ok: true,
      error: null
    };
  } catch (error) {
    return {
      venueKey: "bachataCommunity",
      venue: "Bachata Community",
      sourceUrl: sourceCalendarUrl,
      classes: [],
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
