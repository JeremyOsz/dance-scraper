import type { VenueKey } from "@/lib/types";

export const VENUES: Record<VenueKey, { label: string; sourceUrl: string }> = {
  thePlace: {
    label: "The Place",
    sourceUrl: "https://theplace.org.uk/dance/classes-and-courses"
  },
  rambert: {
    label: "Rambert",
    sourceUrl: "https://rambert.org.uk/classes/"
  },
  siobhanDavies: {
    label: "Siobhan Davies Studios",
    sourceUrl: "https://www.siobhandavies.com/events/classes-2/"
  },
  tripSpace: {
    label: "TripSpace",
    sourceUrl: "https://tripspace.co.uk/dance/"
  },
  chisenhaleDanceSpace: {
    label: "Chisenhale Dance Space",
    sourceUrl: "https://www.chisenhaledancespace.co.uk/independent-events/"
  },
  ciCalendarLondon: {
    label: "CI Calendar London",
    sourceUrl: "https://cicalendar.uk/london"
  },
  bachataCommunity: {
    label: "Bachata Community",
    sourceUrl: "https://bachatacommunity.space/"
  },
  ecstaticDanceLondon: {
    label: "Ecstatic Dance London",
    sourceUrl: "https://www.eventbrite.com/o/73047023743"
  },
  fiveRhythmsLondon: {
    label: "Five Rhythms London",
    sourceUrl: "https://www.5rhythms.com/classes/London"
  }
};
