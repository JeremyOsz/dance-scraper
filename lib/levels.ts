import type { DanceSession } from "@/lib/types";

export const LEVELS = ["Beginner", "Intermediate", "Advanced", "Open Level", "All Levels"] as const;

export type Level = (typeof LEVELS)[number];

const LEVEL_PATTERNS: Record<Level, RegExp[]> = {
  Beginner: [
    /\bbeginners?\b/i,
    /\babsolute\s+beginners?\b/i,
    /\bintro(?:duction|ductory)?\b/i,
    /\bfoundation(?:s)?\b/i,
    /\blevel\s*1\b/i
  ],
  Intermediate: [/\bintermediate\b/i, /\bimprovers?\b/i, /\blevel\s*2\b/i],
  Advanced: [/\badvanced\b/i, /\bprofessional\b/i, /\bpro\s*class\b/i, /\blevel\s*3\b/i],
  "Open Level": [/\bopen[\s-]?level\b/i, /\ball\s+welcome\b/i, /\bmixed[\s-]?level\b/i],
  "All Levels": [/\ball\s+levels?\b/i, /\bsuitable\s+for\s+all\b/i, /\bevery\s+level\b/i]
};

export function inferSessionLevels(session: Pick<DanceSession, "title" | "details" | "tags">): Level[] {
  const text = `${session.title} ${session.details ?? ""} ${session.tags.join(" ")}`;
  return LEVELS.filter((level) => LEVEL_PATTERNS[level].some((pattern) => pattern.test(text)));
}

export function matchesSessionLevel(session: Pick<DanceSession, "title" | "details" | "tags">, selectedLevel: string) {
  const levels = inferSessionLevels(session);
  return levels.includes(selectedLevel as Level);
}
