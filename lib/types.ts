import type { DanceStyle } from "@/lib/dance-types";

export type VenueKey =
  | "thePlace"
  | "rambert"
  | "siobhanDavies"
  | "tripSpace"
  | "chisenhaleDanceSpace"
  | "ciCalendarLondon"
  | "bachataCommunity"
  | "ecstaticDanceLondon"
  | "luminousDance"
  | "fiveRhythmsLondon"
  | "superMarioSalsa"
  | "salsaRuedaRuedaLibre"
  | "cubaneando"
  | "butohMutations"
  | "butohUk"
  | "posthumanTheatreButoh"
  | "hackneyBaths"
  | "wednesdayMoving"
  | "danceworks"
  | "pineappleDanceStudios"
  | "baseDanceStudios"
  | "salsaSoho"
  | "barSalsaTemple"
  | "mamboCity"
  | "cityAcademy"
  | "adrianOutsavvy"
  | "marinaSfyridi"
  | "lookAtMovement"
  | "theManorMvmt"
  | "eastLondonDance"
  | "conTumbaoSalsa"
  | "underTheSunDance"
  | "balletForYou"
  | "fieldworksDance"
  | "cplayCy"
  | "danielRodriguezEventbrite"
  | "rachelMannMarlonWhoHenry"
  | "gelNow"
  | "oneSyllable"
  | "coletHouse"
  | "studio66"
  | "tangoFever"
  | "queerSalsa"
  | "londonSchoolOfCapoeira"
  | "swingland"
  | "trinityLaban"
  | "englishNationalBallet"
  | "customEvents";

export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday"
  | null;

/** Inclusive ISO date range (yyyy-MM-dd) when a session does not run (e.g. school half-term). */
export type SessionExcludedDateRange = { start: string; end: string };

export type DanceSession = {
  id: string;
  /** Stable source adapter key. Optional only for legacy persisted rows. */
  sourceKey?: VenueKey;
  /** Canonical provider name. `venue` remains its legacy alias. */
  organizer?: string;
  venue: string;
  locationName?: string | null;
  address?: string | null;
  postcode?: string | null;
  borough?: string | null;
  title: string;
  details: string | null;
  dayOfWeek: DayOfWeek;
  startTime: string | null;
  endTime: string | null;
  startDate: string | null;
  endDate: string | null;
  /** Weekly (or dated) sessions omitted on these inclusive dates — used by The Place term-time classes. */
  excludedDateRanges?: SessionExcludedDateRange[];
  timezone: "Europe/London";
  bookingUrl: string;
  sourceUrl: string;
  tags: string[];
  styles?: DanceStyle[];
  /** Non-fatal parser checks retained for diagnostics and manual verification. */
  dataQualityWarnings?: string[];
  audience: "adult" | "open" | "all-ages";
  isWorkshop: boolean;
  isCourse: boolean;
  lastSeenAt: string;
};

/** Optional signed `/api/go` targets, attached on the server for click tracking. */
export type DanceSessionOutbound = DanceSession & {
  outboundBookingHref?: string;
  outboundSourceHref?: string;
};

export type VenueStatus = {
  venue: string;
  key: VenueKey;
  sourceUrl: string;
  count: number;
  ok: boolean;
  lastSuccessAt: string | null;
  lastError: string | null;
  /** When set (e.g. custom listings), merge evicts prior sessions for any of these venue labels. */
  replacedVenueLabels?: string[];
};

export type ScrapeOutput = {
  generatedAt: string;
  sessions: DanceSession[];
  venues: VenueStatus[];
};

/** Archived dated sessions evicted from the live file after a successful venue re-scrape. */
export type PastSessionsArchive = {
  updatedAt: string;
  sessions: DanceSession[];
};
