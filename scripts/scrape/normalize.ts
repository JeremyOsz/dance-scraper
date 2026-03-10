import fs from "node:fs";
import path from "node:path";
import type { DanceSession, ScrapeOutput, VenueStatus } from "../../lib/types";
import type { AdapterOutput, ScrapedClass } from "./types";

const DAY_MATCH = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i;
const TIME_RANGE = /(\d{1,2}(?::|\.)?\d{0,2}\s*[ap]m?)\s*(?:-|–|to)\s*(\d{1,2}(?::|\.)?\d{0,2}\s*[ap]m?)/i;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeDay(input: string | null): DanceSession["dayOfWeek"] {
  if (!input) return null;
  const match = input.match(DAY_MATCH);
  if (!match) return null;
  return (match[1][0].toUpperCase() + match[1].slice(1).toLowerCase()) as DanceSession["dayOfWeek"];
}

function normalizeTimeRange(input: string | null): { start: string | null; end: string | null } {
  if (!input) return { start: null, end: null };
  const match = input.replace(/\s+/g, " ").trim().match(TIME_RANGE);
  if (!match) return { start: input, end: null };
  return {
    start: match[1].replace(/\s+/g, " ").trim(),
    end: match[2].replace(/\s+/g, " ").trim()
  };
}

function inferAudience(text: string): DanceSession["audience"] {
  const v = text.toLowerCase();
  if (v.includes("all ages") || v.includes("family")) return "all-ages";
  if (v.includes("open to all") || v.includes("open level")) return "open";
  return "adult";
}

function inferWorkshop(text: string): boolean {
  return /(workshop|masterclass|intensive|lab|immersion)/i.test(text);
}

function isNoiseTitle(rawTitle: string): boolean {
  const title = rawTitle.trim().toLowerCase();
  return [
    "menu",
    "home",
    "log in",
    "instagram",
    "facebook",
    "credits",
    "privacy policy",
    "terms & conditions",
    "terms and conditions",
    "stay informed",
    "it’s your move",
    "it's your move",
    "more info / book now",
    "more info / book",
    "opportunities"
  ].includes(title);
}

function isInScope(raw: ScrapedClass): boolean {
  const text = `${raw.title} ${raw.details ?? ""}`.toLowerCase();
  const looksChildOnly = /(children|kids|youth|infants|juniors|ages?\s*\d)/i.test(text);
  const explicitlyOpen = /(all ages|family|open to all|open level|adult)/i.test(text);
  if (isNoiseTitle(raw.title)) return false;
  return !looksChildOnly || explicitlyOpen;
}

function inferTags(raw: ScrapedClass): string[] {
  const text = `${raw.title} ${raw.details ?? ""}`.toLowerCase();
  const tags = ["contemporary", "ballet", "improvisation", "yoga", "pilates", "gaga", "afro", "floorwork"];
  return tags.filter((tag) => text.includes(tag));
}

function toSession(raw: ScrapedClass, seenAt: string): DanceSession {
  const time = normalizeTimeRange(raw.time);
  const text = `${raw.title} ${raw.details ?? ""}`;
  const day = normalizeDay(raw.dayOfWeek ?? raw.details ?? null);
  const key = `${raw.venue}|${raw.title}|${day ?? "na"}|${time.start ?? "na"}`;

  return {
    id: slugify(key),
    venue: raw.venue,
    title: raw.title.trim(),
    details: raw.details?.trim() || null,
    dayOfWeek: day,
    startTime: time.start,
    endTime: time.end,
    startDate: raw.startDate,
    endDate: raw.endDate,
    timezone: "Europe/London",
    bookingUrl: raw.bookingUrl,
    sourceUrl: raw.sourceUrl,
    tags: inferTags(raw),
    audience: inferAudience(text),
    isWorkshop: inferWorkshop(text),
    lastSeenAt: seenAt
  };
}

export function buildOutput(results: AdapterOutput[]): ScrapeOutput {
  const generatedAt = new Date().toISOString();
  const sessions: DanceSession[] = [];
  const venueStatus: VenueStatus[] = [];
  const dedupe = new Set<string>();

  for (const result of results) {
    venueStatus.push({
      venue: result.venue,
      key: result.venueKey,
      sourceUrl: result.sourceUrl,
      count: result.classes.length,
      ok: result.ok,
      lastSuccessAt: result.ok ? generatedAt : null,
      lastError: result.error
    });

    for (const klass of result.classes) {
      if (!klass.title || !klass.bookingUrl) {
        continue;
      }
      if (!isInScope(klass)) {
        continue;
      }
      const session = toSession(klass, generatedAt);
      if (dedupe.has(session.id)) continue;
      dedupe.add(session.id);
      sessions.push(session);
    }
  }

  return {
    generatedAt,
    sessions,
    venues: venueStatus
  };
}

export function writeOutput(output: ScrapeOutput) {
  const targetDir = path.join(process.cwd(), "data");
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "classes.normalized.json"), JSON.stringify(output, null, 2));
}
