import type { DanceSession, VenueKey } from "@/lib/types";
import { VENUES } from "@/lib/venues";

export type FeaturedRule = {
  venueKey?: VenueKey;
  titleContains?: string;
  tag?: string;
};

export const FEATURED_RULES: FeaturedRule[] = [
  { titleContains: "How the voice moves: a poetry & dance improv workshop" },
  { titleContains: "Play and Expression Workshop" },
  { venueKey: "luminousDance" }
];

export function isFeaturedSession(session: DanceSession): boolean {
  return FEATURED_RULES.some((rule) => {
    if (rule.venueKey && VENUES[rule.venueKey].label !== session.venue) {
      return false;
    }
    if (rule.titleContains && !session.title.toLowerCase().includes(rule.titleContains.toLowerCase())) {
      return false;
    }
    if (rule.tag && !session.tags.includes(rule.tag)) {
      return false;
    }
    return true;
  });
}

export function isFeaturedVenueName(name: string): boolean {
  return FEATURED_RULES.some((rule) => rule.venueKey && VENUES[rule.venueKey].label === name);
}
