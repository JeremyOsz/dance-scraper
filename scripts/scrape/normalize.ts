import fs from "node:fs";
import path from "node:path";
import type { DanceSession, ScrapeOutput, VenueStatus } from "../../lib/types";
import type { AdapterOutput, ScrapedClass } from "./types";

const DAY_MATCH = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i;
const TIME_RANGE = /(\d{1,2}(?::|\.)?\d{0,2}\s*[ap]m?)\s*(?:-|–|to)\s*(\d{1,2}(?::|\.)?\d{0,2}\s*[ap]m?)/i;
const TIME_RANGE_RELAXED =
  /(\d{1,2}(?::|\.)?\d{0,2}\s*(?:[ap]m?)?)\s*(?:-|–|—|to)\s*(\d{1,2}(?::|\.)?\d{0,2}\s*(?:[ap]m?)?)/i;
const TIME_RANGE_24H = /\b((?:[01]?\d|2[0-3])[:.]\d{2})\s*(?:-|–|—|to)\s*((?:[01]?\d|2[0-3])[:.]\d{2})\b/i;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeTitleForDedupe(title: string): string {
  const normalized = title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/@/g, " at ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!normalized) return "";
  return normalized
    .split(/\s+/)
    .filter((token) => token !== "x" && token !== "at")
    .join(" ");
}

function normalizeDay(input: string | null): DanceSession["dayOfWeek"] {
  if (!input) return null;
  const match = input.match(DAY_MATCH);
  if (!match) return null;
  return (match[1][0].toUpperCase() + match[1].slice(1).toLowerCase()) as DanceSession["dayOfWeek"];
}

function normalizeTimeRange(input: string | null): { start: string | null; end: string | null } {
  if (!input) return { start: null, end: null };
  const clean = input
    .replace(/\b12\s*noon\b/gi, "12pm")
    .replace(/\b12\s*midnight\b/gi, "12am")
    .replace(/\bnoon\b/gi, "12pm")
    .replace(/\bmidnight\b/gi, "12am")
    .replace(/\s+/g, " ")
    .trim();
  const match = clean.match(TIME_RANGE);
  if (match) {
    return {
      start: match[1].replace(/\s+/g, " ").trim(),
      end: match[2].replace(/\s+/g, " ").trim()
    };
  }
  const match24h = clean.match(TIME_RANGE_24H);
  if (match24h) {
    return {
      start: match24h[1].replace(/\s+/g, " ").trim(),
      end: match24h[2].replace(/\s+/g, " ").trim()
    };
  }

  const relaxed = clean.match(TIME_RANGE_RELAXED);
  if (!relaxed) return { start: clean, end: null };

  const normalizeToken = (token: string) => token.replace(/\s+/g, " ").trim();
  const inferMeridiem = (token: string) => {
    const meridiemMatch = token.match(/([ap])m?\b/i);
    return meridiemMatch ? `${meridiemMatch[1].toLowerCase()}m` : null;
  };
  const applyMeridiem = (token: string, meridiem: string | null) => {
    const normalized = normalizeToken(token);
    if (!meridiem || /[ap]m?\b/i.test(normalized)) {
      return normalized;
    }
    return `${normalized} ${meridiem}`;
  };

  const startToken = normalizeToken(relaxed[1]);
  const endToken = normalizeToken(relaxed[2]);
  const inferredMeridiem = inferMeridiem(startToken) ?? inferMeridiem(endToken);

  return {
    start: applyMeridiem(startToken, inferredMeridiem),
    end: applyMeridiem(endToken, inferredMeridiem)
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
  const tagMatchers: Array<{ tag: string; pattern: RegExp }> = [
    { tag: "contemporary", pattern: /\bcontemporary\b/i },
    { tag: "ballet", pattern: /\bballet\b/i },
    { tag: "improv", pattern: /\bimprov\b/i },
    { tag: "improvisation", pattern: /\bimprovis(?:ation|ational)\b/i },
    { tag: "contact improv", pattern: /\bcontact\s+improv\b/i },
    { tag: "contact improvisation", pattern: /\bcontact\s+improvis(?:ation|ational)\b/i },
    { tag: "ecstatic dance", pattern: /\becstatic\s+dance\b/i },
    { tag: "5rhythms", pattern: /\b5\s*rhythms?\b/i },
    { tag: "5rythms", pattern: /\b5rythms?\b/i },
    { tag: "hip hop", pattern: /\bhip[\s-]?hop\b/i },
    { tag: "yoga", pattern: /\byoga\b/i },
    { tag: "pilates", pattern: /\bpilates\b/i },
    { tag: "gaga", pattern: /\bgaga\b/i },
    { tag: "afro", pattern: /\bafro\b/i },
    { tag: "floorwork", pattern: /\bfloorwork\b/i }
  ];
  return tagMatchers.filter(({ pattern }) => pattern.test(text)).map(({ tag }) => tag);
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
    excludedDateRanges: raw.excludedDateRanges,
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
      lastError: result.error,
      replacedVenueLabels: result.replacedVenueLabels
    });

    for (const klass of result.classes) {
      if (!klass.title || !klass.bookingUrl) {
        continue;
      }
      if (!isInScope(klass)) {
        continue;
      }
      const session = toSession(klass, generatedAt);
      const dedupeKey = [
        session.venue.toLowerCase(),
        normalizeTitleForDedupe(session.title),
        session.dayOfWeek ?? "na",
        session.startDate ?? "na",
        session.endDate ?? "na",
        session.startTime ?? "na",
        session.endTime ?? "na"
      ].join("|");
      if (dedupe.has(dedupeKey)) continue;
      dedupe.add(dedupeKey);
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
