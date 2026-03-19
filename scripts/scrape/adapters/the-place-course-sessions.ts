/** Course detail pages embed Spektrix-style JSON with one entry per bookable session. */
const SESSION_START_RE = /"startDate"\s*:\s*"(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}/g;

export function extractPlaceCourseSessionDates(html: string): string[] {
  const seen = new Set<string>();
  for (const m of html.matchAll(SESSION_START_RE)) {
    seen.add(m[1]!);
  }
  return [...seen].sort();
}
