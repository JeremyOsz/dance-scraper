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
  venue: string;
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
  audience: "adult" | "open" | "all-ages";
  isWorkshop: boolean;
  lastSeenAt: string;
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
