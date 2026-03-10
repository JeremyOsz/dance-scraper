import type { DanceSession } from "@/lib/types";

export const DANCE_TYPES = [
  "Contemporary",
  "Ballet",
  "Improv",
  "Contact Improv",
  "Ecstatic Dance/ 5Rythms",
  "Hip Hop",
  "Other"
] as const;

export type DanceType = (typeof DANCE_TYPES)[number];

const TYPE_PATTERNS: Record<Exclude<DanceType, "Other">, RegExp[]> = {
  Contemporary: [/\bcontemporary\b/i],
  Ballet: [/\bballet\b/i],
  Improv: [/\bimprov(?:isation|ization)?\b/i, /\bimprovisation\b/i],
  "Contact Improv": [/\bcontact\s+improv(?:isation|ization)?\b/i, /\bcontact improvisation\b/i],
  "Ecstatic Dance/ 5Rythms": [/\becstatic\s+dance\b/i, /\b5\s*rhythms?\b/i, /\bfive\s+rhythms?\b/i, /\b5rythms?\b/i],
  "Hip Hop": [/\bhip[\s-]?hop\b/i]
};

export function inferDanceTypes(session: Pick<DanceSession, "title" | "details" | "tags">): DanceType[] {
  const text = `${session.title} ${session.details ?? ""} ${session.tags.join(" ")}`;
  const detected = (Object.entries(TYPE_PATTERNS) as [Exclude<DanceType, "Other">, RegExp[]][])
    .filter(([, patterns]) => patterns.some((pattern) => pattern.test(text)))
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
