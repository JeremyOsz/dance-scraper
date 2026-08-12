import type { DanceSession } from "@/lib/types";
import { DANCE_STYLE_GROUPS, inferDanceStyles } from "@/lib/dance-types";

const STYLE_GROUP_TONES = [
  "border-l-violet-300",
  "border-l-emerald-300",
  "border-l-indigo-300",
  "border-l-rose-300",
  "border-l-orange-300",
  "border-l-amber-300",
  "border-l-sky-300",
  "border-l-fuchsia-300"
] as const;

export function getEventTone(session: DanceSession) {
  const primaryStyle = inferDanceStyles(session)[0];
  const groupIndex = DANCE_STYLE_GROUPS.findIndex((group) => (group.styles as readonly string[]).includes(primaryStyle));
  return STYLE_GROUP_TONES[groupIndex] ?? "border-l-stone-300";
}
