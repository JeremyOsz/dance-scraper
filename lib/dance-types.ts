import type { DanceSession } from "@/lib/types";

export const DANCE_TYPES = [
  "Contemporary",
  "Ballet",
  "Improv",
  "Contact Improv",
  "Ecstatic Dance/ 5Rythms",
  "Salsa",
  "Bachata",
  "Butoh",
  "Somatic",
  "Hip Hop",
  "Yoga/Pilates",
  "Jazz",
  "House",
  "Commercial/Heels",
  "Ballroom/Tango",
  "Other"
] as const;

export type DanceType = (typeof DANCE_TYPES)[number];

const TYPE_PATTERNS: Record<Exclude<DanceType, "Other">, RegExp[]> = {
  Contemporary: [/\bcontemporary\b/i],
  Ballet: [/\bballet\b/i],
  Improv: [/\bimprov\b/i, /\bimprovis(?:ation|ational)\b/i],
  "Contact Improv": [/\bcontact\s+improv\b/i, /\bcontact\s+improvis(?:ation|ational)\b/i],
  "Ecstatic Dance/ 5Rythms": [/\becstatic\s+dance\b/i, /\b5\s*rhythms?\b/i, /\bfive\s+rhythms?\b/i, /\b5rythms?\b/i],
  Salsa: [/\bsalsa\b/i],
  Bachata: [/\bbachata\b/i],
  Butoh: [/\bbutoh\b/i],
  Somatic: [/\bsomatic\b/i, /\bgaga\b/i],
  "Hip Hop": [/\bhip[\s-]?hop\b/i],
  "Yoga/Pilates": [/\byoga\b/i, /\bpilates\b/i],
  Jazz: [/\bjazz\b/i],
  House: [/\bhouse\b/i],
  "Commercial/Heels": [/\bcommercial\b/i, /\bheels\b/i, /\bk[\s-]?pop\b/i, /\bdancehall\b/i, /\bafro\b/i, /\bvog(?:ue|uing)\b/i],
  "Ballroom/Tango": [/\bballroom\b/i, /\btango\b/i, /\blatin\b/i, /\blindy\s+hop\b/i, /\bswing\b/i]
};

export function inferDanceTypes(session: Pick<DanceSession, "title" | "details" | "tags">): DanceType[] {
  const coreText = `${session.title} ${session.details ?? ""}`;
  const tagText = session.tags.join(" ");
  const detected = (Object.entries(TYPE_PATTERNS) as [Exclude<DanceType, "Other">, RegExp[]][])
    .filter(([type, patterns]) => {
      // Guard against stale tag false-positives like "improv" on "Improvers" classes.
      if (type === "Improv" || type === "Contact Improv") {
        return patterns.some((pattern) => pattern.test(coreText));
      }
      return patterns.some((pattern) => pattern.test(coreText) || pattern.test(tagText));
    })
    .map(([type]) => type);

  return detected.length ? detected : ["Other"];
}

export function matchesDanceType(
  session: Pick<DanceSession, "title" | "details" | "tags">,
  selectedType: string
): boolean {
  const types = inferDanceTypes(session);
  return types.includes(selectedType as DanceType);
}
