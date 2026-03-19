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
};

export type ScrapeOutput = {
  generatedAt: string;
  sessions: DanceSession[];
  venues: VenueStatus[];
};
