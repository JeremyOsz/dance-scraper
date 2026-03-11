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
  Contemporary: [
    /\bcontemporary\b/i,
    /\btanztheater\b/i,
    /\bchoreograph(?:ic|y)\b/i,
    /\bflying\s+low\b/i,
    /\bpro\s*dance\b/i
  ],
  Ballet: [/\bballet\b/i],
  Improv: [/\bimprov\b/i, /\bimprovis(?:ation|ational)\b/i],
  "Contact Improv": [
    /\bcontact\s+improv\b/i,
    /\bcontact\s+improvis(?:ation|ational)\b/i,
    /\bci\b/i,
    /\bci\s+calendar\b/i,
    /\bci\s*(?:jam|class|intensive|practice|peers?)\b/i,
    /\bcontact\s+jam\b/i
  ],
  "Ecstatic Dance/ 5Rythms": [
    /\becstatic\s+dance\b/i,
    /\b5\s*rhythms?\b/i,
    /\bfive\s+rhythms?\b/i,
    /\b5rythms?\b/i,
    /\bluminous\b/i
  ],
  Salsa: [/\bsalsa\b/i],
  Bachata: [/\bbachata\b/i, /\bbachata\s+community\b/i],
  Butoh: [/\bbutoh\b/i],
  Somatic: [/\bsomatic\b/i, /\bgaga\b/i, /\bklein\s+technique\b/i, /\bmyofascial\b/i, /\bcouples?\s+massage\b/i],
  "Hip Hop": [/\bhip[\s-]?hop\b/i, /\bfreestylers?\b/i, /\bshuffle\b/i],
  "Yoga/Pilates": [/\byoga\b/i, /\bpilates\b/i, /\bvinyasa\b/i, /\bashtanga\b/i, /\byin\b/i],
  Jazz: [/\bjazz\b/i],
  House: [/\bhouse\b/i],
  "Commercial/Heels": [
    /\bcommercial\b/i,
    /\bheels\b/i,
    /\bk[\s-]?pop\b/i,
    /\bdancehall\b/i,
    /\bafro\b/i,
    /\bafricanistic\b/i,
    /\bvog(?:ue|uing)\b/i
  ],
  "Ballroom/Tango": [/\bballroom\b/i, /\btango\b/i, /\blatin(?:o)?\b/i, /\blindy\s*hop/i, /\bswing\b/i]
};

export function inferDanceTypes(
  session: Pick<DanceSession, "title" | "details" | "tags"> & { venue?: string | null }
): DanceType[] {
  const coreText = `${session.title} ${session.details ?? ""}`;
  const venueText = session.venue ?? "";
  const tagText = session.tags.join(" ");
  const detected = (Object.entries(TYPE_PATTERNS) as [Exclude<DanceType, "Other">, RegExp[]][])
    .filter(([type, patterns]) => {
      // Guard against stale tag false-positives like "improv" on "Improvers" classes.
      if (type === "Improv" || type === "Contact Improv") {
        return patterns.some((pattern) => pattern.test(coreText) || pattern.test(venueText));
      }
      return patterns.some((pattern) => pattern.test(coreText) || pattern.test(tagText) || pattern.test(venueText));
    })
    .map(([type]) => type);

  if (detected.length === 0) {
    const title = session.title;
    const venue = session.venue ?? "";

    if (/\brambert\b/i.test(venue) && /\bprofessional\s+class(?:es)?\b/i.test(title)) {
      return ["Contemporary"];
    }
    if (/\bthe\s+place\b/i.test(venue) && /\bprofessional\s+class(?:es)?\b/i.test(title)) {
      return ["Contemporary"];
    }
    if (/\bsiobhan\s+davies\b/i.test(venue) && /\bmorning\s+class\b/i.test(title)) {
      return ["Contemporary"];
    }
  }

  return detected.length ? detected : ["Other"];
}

export function matchesDanceType(
  session: Pick<DanceSession, "title" | "details" | "tags"> & { venue?: string | null },
  selectedType: string
): boolean {
  const types = inferDanceTypes(session);
  return types.includes(selectedType as DanceType);
}
