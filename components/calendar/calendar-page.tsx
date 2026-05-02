"use client";

import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  format,
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfDay,
  subDays,
  subMonths
} from "date-fns";
import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bookmark,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  ListFilter,
  MapPin,
  Search,
  Share2,
  Star
} from "lucide-react";
import { TrackedOutboundLink } from "@/components/tracked-outbound-link";
import { extractOutboundHostname } from "@/lib/outbound-utils";
import type { DanceSession, DanceSessionOutbound, DayOfWeek } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { canAddSessionToCalendar } from "@/lib/calendar-export";
import { DANCE_TYPES, inferDanceTypes, matchesDanceType, type DanceType } from "@/lib/dance-types";
import { ORDERED_DAYS, formatTimeRange, getForwardDayWindow, getMonthGridDates, isSessionActiveOnDate } from "@/lib/date";
import { isFeaturedSession, isFeaturedVenueName } from "@/lib/featured";
import { LEVELS, matchesSessionLevel, type Level } from "@/lib/levels";
import { getVenueMapQuery } from "@/lib/venues";
import { getVenuePriorityBucket, sortVenueRecordsForUi } from "@/lib/venue-order";
import { SiteSocialLinks } from "@/components/site-social-links";

const SHORTLIST_STORAGE_KEY = "dance-scraper.shortlist-session-ids";
const INITIAL_WEEK_DAY_COUNT = 7;
const LAZY_LOAD_DAY_CHUNK = 7;
const MAX_LOADED_CALENDAR_DAYS = 56;
const LOADING_CARD_ROW_COUNTS = [3, 2, 2, 3, 1, 2, 1] as const;
const DANCE_TYPE_BADGE_CLASS: Record<DanceType, string> = {
  Contemporary: "border-transparent bg-sky-100 text-sky-800",
  Ballet: "border-transparent bg-rose-100 text-rose-800",
  Improv: "border-transparent bg-emerald-100 text-emerald-800",
  "Contact Improv": "border-transparent bg-teal-100 text-teal-800",
  "Ecstatic Dance/ 5Rythms": "border-transparent bg-amber-100 text-amber-900",
  Salsa: "border-transparent bg-red-100 text-red-800",
  Bachata: "border-transparent bg-pink-100 text-pink-800",
  Butoh: "border-transparent bg-zinc-200 text-zinc-900",
  Somatic: "border-transparent bg-lime-100 text-lime-800",
  "Hip Hop": "border-transparent bg-violet-100 text-violet-800",
  "Yoga/Pilates": "border-transparent bg-cyan-100 text-cyan-800",
  Jazz: "border-transparent bg-orange-100 text-orange-800",
  House: "border-transparent bg-indigo-100 text-indigo-800",
  "Commercial/Heels": "border-transparent bg-fuchsia-100 text-fuchsia-800",
  "Ballroom/Tango": "border-transparent bg-yellow-100 text-yellow-800",
  Other: "border-transparent bg-stone-200 text-stone-800"
};
const DANCE_TYPE_CARD_CLASS: Record<DanceType, string> = {
  Contemporary: "border-l-sky-600",
  Ballet: "border-l-rose-600",
  Improv: "border-l-emerald-600",
  "Contact Improv": "border-l-teal-600",
  "Ecstatic Dance/ 5Rythms": "border-l-amber-600",
  Salsa: "border-l-red-600",
  Bachata: "border-l-pink-600",
  Butoh: "border-l-zinc-900",
  Somatic: "border-l-lime-700",
  "Hip Hop": "border-l-violet-700",
  "Yoga/Pilates": "border-l-cyan-700",
  Jazz: "border-l-orange-600",
  House: "border-l-indigo-700",
  "Commercial/Heels": "border-l-fuchsia-700",
  "Ballroom/Tango": "border-l-yellow-600",
  Other: "border-l-slate-500"
};
const editorialPanelClass = "border border-slate-900/80 bg-white/95 shadow-[4px_4px_0_rgba(15,23,42,0.16)]";
const editorialInsetClass = "border border-slate-900/25 bg-white/90";
const editorialButtonClass = "rounded-sm border-slate-900/45";
const iconClass = "h-4 w-4 shrink-0";
const GAGA_BOYCOTT_ARTICLE_URL = "https://www.instagram.com/p/DSXaLAIiIh2/";
// const UK_DANCERS_FOR_PALESTINE_TICKETS_URL = "https://www.tickettailor.com/events/ukdancersforpalestine";
const UK_DANCERS_FOR_PALESTINE_INSTAGRAM_URL = "https://www.instagram.com/uk_dancers_for_palestine/";
const GAGA_BOYCOTT_MESSAGE_REMAINDER = "This studio hosts other independent teachers. Please consider supporting them instead.";

function groupByDate(sessions: DanceSession[], dateList: Date[]) {
  const byDate = new Map<string, DanceSession[]>();
  for (const date of dateList) {
    const iso = format(date, "yyyy-MM-dd");
    byDate.set(
      iso,
      sessions.filter((session) => isSessionActiveOnDate(session, iso))
    );
  }
  return byDate;
}

function isUndatedSession(session: DanceSession) {
  return !session.dayOfWeek && !session.startDate && !session.endDate;
}

function isGagaSession(session: Pick<DanceSession, "title" | "details" | "tags">) {
  return /\bgaga\b/i.test(`${session.title} ${session.details ?? ""}`) || session.tags.some((tag) => /\bgaga\b/i.test(tag));
}

function GagaBoycottCard({ session, onOpen }: { session: DanceSession; onOpen: () => void }) {
  return (
    <div className="overflow-hidden rounded-[18px] border-[3px] border-emerald-700 bg-[#ff5b76] text-xs text-zinc-900 shadow-sm">
      <div className="relative h-20 w-full overflow-hidden" aria-hidden>
        <Image src="/palestine-flag.svg" alt="" fill className="object-cover" sizes="100vw" />
      </div>
      <div className="space-y-2.5 bg-[linear-gradient(180deg,rgba(255,246,248,0.98)_0%,rgba(255,239,242,0.98)_100%)] px-5 py-4">
        <button onClick={onOpen} className="block w-full text-left hover:text-foreground/90">
          <div className="space-y-1">
            <p className="font-medium text-foreground">{session.title}</p>
            <p className="text-muted-foreground">
              {session.startTime || session.endTime
                ? formatTimeRange(session.startTime, session.endTime)
                : session.dayOfWeek ?? "Time TBC"}
            </p>
            <p>{session.venue}</p>
          </div>
          <p className="leading-relaxed text-foreground/90">
            <strong>Boycott of Batsheva/ Gaga called by Dancers for Palestine.</strong>{" "}<br />
            {GAGA_BOYCOTT_MESSAGE_REMAINDER}
          </p>
        </button>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <a
            href={GAGA_BOYCOTT_ARTICLE_URL}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="relative z-10 inline-flex cursor-pointer items-center rounded-full border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-stone-50"
          >
            Why Boycott
          </a>
        </div>
      </div>
    </div>
  );
}

function GagaSessionDialogContent({
  session,
  shortlistSet,
  toggleShortlist
}: {
  session: DanceSession;
  shortlistSet: Set<string>;
  toggleShortlist: (sessionId: string) => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl sm:text-3xl">{session.title.toUpperCase()}</DialogTitle>
        <DialogDescription asChild>
          <div className="space-y-1 pt-1 text-base not-italic text-foreground/70">
            <div>
              {session.venue} • {session.dayOfWeek ?? "Day TBC"} • {formatTimeRange(session.startTime, session.endTime)}
            </div>
          </div>
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-5 pt-2 text-sm">
        <div className="flex flex-wrap gap-2">
          {inferDanceTypes(session).map((type) => (
            <Badge key={`${session.id}-${type}`} className={DANCE_TYPE_BADGE_CLASS[type]}>
              {type}
            </Badge>
          ))}
        </div>
        <p className="text-base">
          <strong>Boycott called by Dancers for Palestine.</strong> {GAGA_BOYCOTT_MESSAGE_REMAINDER}
        </p>
        <p className="text-base">
          Date range: {session.startDate ?? "Open"} to {session.endDate ?? "Open"}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant={shortlistSet.has(session.id) ? "default" : "outline"}
            onClick={() => toggleShortlist(session.id)}
          >
            {shortlistSet.has(session.id) ? "Remove from shortlist" : "Save to shortlist"}
          </Button>
          {canAddSessionToCalendar(session) ? (
            <Button variant="outline" asChild>
              <a href={`/api/classes/${encodeURIComponent(session.id)}/calendar`}>Add to calendar</a>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              Add to calendar unavailable
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <a href={UK_DANCERS_FOR_PALESTINE_INSTAGRAM_URL} target="_blank" rel="noreferrer">
              UK Dancers for Palestine
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={GAGA_BOYCOTT_ARTICLE_URL} target="_blank" rel="noreferrer">
              Why Boycott Batsheva
            </a>
          </Button>
        </div>
      </div>
    </>
  );
}

function readStoredList(key: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function sortSessionsForDisplay(sessions: DanceSession[], countByVenue: Map<string, number>) {
  return [...sessions].sort((a, b) => {
    const aFeatured = isFeaturedSession(a);
    const bFeatured = isFeaturedSession(b);
    if (aFeatured !== bFeatured) {
      return Number(bFeatured) - Number(aFeatured);
    }

    const aVenuePriority = getVenuePriorityBucket(a.venue);
    const bVenuePriority = getVenuePriorityBucket(b.venue);
    if (aVenuePriority !== bVenuePriority) {
      return aVenuePriority - bVenuePriority;
    }

    const aVenueCount = countByVenue.get(a.venue) ?? 0;
    const bVenueCount = countByVenue.get(b.venue) ?? 0;
    if (aVenueCount !== bVenueCount) {
      return aVenueCount - bVenueCount;
    }

    const aTime = a.startTime ?? "99:99";
    const bTime = b.startTime ?? "99:99";
    if (aTime !== bTime) {
      return aTime.localeCompare(bTime);
    }

    const venueCmp = a.venue.localeCompare(b.venue);
    if (venueCmp !== 0) {
      return venueCmp;
    }

    return a.title.localeCompare(b.title);
  });
}

type VenueCard = {
  name: string;
  sourceUrl: string;
  outboundSourceHref?: string;
  mapQuery?: string;
  count: number;
  ok: boolean;
  lastSuccessAt: string | null;
  lastError: string | null;
};

type Props = {
  classCount?: number;
  initialSessions?: DanceSessionOutbound[];
  /** Preformatted for display; avoids client/server date formatting skew. */
  listingsUpdatedText?: string;
  venues: VenueCard[];
  venueCount?: number;
  seoSnapshot?: React.ReactNode;
};

function hrefForOutboundBooking(session: DanceSessionOutbound) {
  return session.outboundBookingHref ?? session.bookingUrl;
}

function hrefForOutboundSource(session: DanceSessionOutbound) {
  return session.outboundSourceHref ?? session.sourceUrl;
}

function hrefForVenueSite(venue: VenueCard) {
  return venue.outboundSourceHref ?? venue.sourceUrl;
}

function getVenueStatus(venue: Props["venues"][number]) {
  if (!venue.ok) {
    return { label: "Error scraping", variant: "outline" as const };
  }
  if (venue.count === 0) {
    return { label: "No events", variant: "outline" as const };
  }
  return { label: "OK", variant: "secondary" as const };
}

function CalendarLoadingState() {
  return (
    <div className={`${editorialPanelClass} p-3`} role="status" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Loading latest class listings</p>
          <p className="text-xs text-muted-foreground">Preparing the calendar from current venue data.</p>
        </div>
        <Badge className="rounded-sm border-slate-900/40 bg-accent text-accent-foreground">Live schedule</Badge>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden bg-muted">
        <div className="h-full w-1/2 animate-pulse bg-primary/80" />
      </div>
    </div>
  );
}

function CalendarDayLoadingSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border border-slate-900/20 bg-white/80 p-2">
          <div className="animate-pulse space-y-2">
            <div className="h-3 w-3/4 rounded bg-muted" />
            <div className="h-2.5 w-1/2 rounded bg-muted" />
            <div className="h-2.5 w-2/3 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function parseCsvParam(params: URLSearchParams | Readonly<URLSearchParams>, key: string) {
  const value = params.get(key);
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseBooleanParam(params: URLSearchParams | Readonly<URLSearchParams>, key: string) {
  const value = params.get(key);
  return value === "1" || value === "true";
}

function parseAnchorDate(value: string | null) {
  if (!value) {
    return startOfDay(new Date());
  }
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? startOfDay(new Date()) : startOfDay(parsed);
}

export function CalendarPage({ classCount, initialSessions, listingsUpdatedText, venues, venueCount, seoSnapshot }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasInitialSessions = initialSessions !== undefined;
  const [sessions, setSessions] = useState<DanceSessionOutbound[]>(() => initialSessions ?? []);
  const [sessionsLoading, setSessionsLoading] = useState(!hasInitialSessions);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [mode, setMode] = useState<"calendar" | "venues" | "map">("calendar");
  const [view, setView] = useState<"week" | "month">("week");
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date()));
  const [loadedDayCount, setLoadedDayCount] = useState(INITIAL_WEEK_DAY_COUNT);
  const [selectedSession, setSelectedSession] = useState<DanceSessionOutbound | null>(null);
  const [search, setSearch] = useState("");
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [workshopsOnly, setWorkshopsOnly] = useState(false);
  const [shortlistSessionIds, setShortlistSessionIds] = useState<string[]>([]);
  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapVenue, setMapVenue] = useState<string>("all");
  const [urlReady, setUrlReady] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [shareFallbackUrl, setShareFallbackUrl] = useState<string | null>(null);

  const weekScrollRef = useRef<HTMLDivElement>(null);
  const weekLoadSentinelRef = useRef<HTMLDivElement>(null);

  const venueNames = useMemo(() => sortVenueRecordsForUi(venues).map((venue) => venue.name), [venues]);

  const selectedDaysKey = useMemo(() => selectedDays.join(","), [selectedDays]);

  useEffect(() => {
    if (hasInitialSessions) {
      setSessions(initialSessions);
      setSessionsLoading(false);
      setSessionsError(null);
      return;
    }

    let cancelled = false;
    setSessionsLoading(true);
    setSessionsError(null);

    fetch("/api/classes", { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Classes API returned ${response.status}`);
        }
        const payload = (await response.json()) as { sessions?: DanceSessionOutbound[] };
        if (!Array.isArray(payload.sessions)) {
          throw new Error("Classes API response did not include sessions");
        }
        if (!cancelled) {
          setSessions(payload.sessions);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessionsError("Unable to load class listings. Please refresh and try again.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSessionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasInitialSessions, initialSessions]);

  useEffect(() => {
    setLoadedDayCount(INITIAL_WEEK_DAY_COUNT);
  }, [anchorDate, view, selectedDaysKey]);

  useEffect(() => {
    const storedShortlist = readStoredList(SHORTLIST_STORAGE_KEY);
    setShortlistSessionIds(storedShortlist);
  }, []);

  useEffect(() => {
    const modeParam = searchParams.get("mode");
    const nextMode = modeParam === "venues" || modeParam === "map" ? modeParam : "calendar";
    setMode(nextMode);

    const viewParam = searchParams.get("view");
    const nextView = viewParam === "month" ? "month" : "week";
    setView(nextView);

    setAnchorDate(parseAnchorDate(searchParams.get("date")));
    setSearch(searchParams.get("q") ?? "");

    const nextVenues = parseCsvParam(searchParams, "venue").filter((venue) => venueNames.includes(venue));
    setSelectedVenues(nextVenues);

    const nextDays = parseCsvParam(searchParams, "day").filter((day): day is Exclude<DayOfWeek, null> =>
      ORDERED_DAYS.includes(day as Exclude<DayOfWeek, null>)
    );
    setSelectedDays(nextDays);

    const nextTypes = parseCsvParam(searchParams, "type").filter((type): type is DanceType =>
      DANCE_TYPES.includes(type as DanceType)
    );
    setSelectedTypes(nextTypes);

    const nextLevels = parseCsvParam(searchParams, "level").filter((level): level is Level =>
      LEVELS.includes(level as Level)
    );
    setSelectedLevels(nextLevels);

    setWorkshopsOnly(parseBooleanParam(searchParams, "workshops"));
    setShortlistOnly(parseBooleanParam(searchParams, "shortlist"));

    const mapParam = searchParams.get("map");
    if (mapParam === "all" || (mapParam && venueNames.includes(mapParam))) {
      setMapVenue(mapParam);
    } else {
      setMapVenue("all");
    }

    setUrlReady(true);
  }, [searchParams, venueNames]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify(shortlistSessionIds));
  }, [shortlistSessionIds]);

  useEffect(() => {
    if (!urlReady) {
      return;
    }
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("view", view);
    if (search.trim()) params.set("q", search.trim());
    if (selectedVenues.length > 0) params.set("venue", selectedVenues.join(","));
    if (selectedDays.length > 0) params.set("day", selectedDays.join(","));
    if (selectedTypes.length > 0) params.set("type", selectedTypes.join(","));
    if (selectedLevels.length > 0) params.set("level", selectedLevels.join(","));
    if (workshopsOnly) params.set("workshops", "1");
    if (shortlistOnly) params.set("shortlist", "1");
    if (mapVenue !== "all") params.set("map", mapVenue);

    const nextQuery = params.toString();
    if (nextQuery !== searchParams.toString()) {
      router.replace(`${pathname}?${nextQuery}` as Route, { scroll: false });
    }
  }, [
    mapVenue,
    mode,
    pathname,
    router,
    search,
    searchParams,
    selectedDays,
    selectedLevels,
    selectedTypes,
    selectedVenues,
    shortlistOnly,
    urlReady,
    view,
    workshopsOnly
  ]);

  useEffect(() => {
    if (shortlistOnly && shortlistSessionIds.length === 0) {
      setShortlistOnly(false);
    }
  }, [shortlistOnly, shortlistSessionIds.length]);

  useEffect(() => {
    if (!shareMessage) {
      return;
    }
    if (shareFallbackUrl) {
      return;
    }
    const timeoutId = window.setTimeout(() => setShareMessage(null), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [shareMessage, shareFallbackUrl]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (selectedVenues.length > 0 && !selectedVenues.includes(session.venue)) {
        return false;
      }
      if (selectedDays.length > 0 && (!session.dayOfWeek || !selectedDays.includes(session.dayOfWeek))) {
        return false;
      }
      if (selectedTypes.length > 0 && !selectedTypes.some((type) => matchesDanceType(session, type))) {
        return false;
      }
      if (selectedLevels.length > 0 && !selectedLevels.some((level) => matchesSessionLevel(session, level))) {
        return false;
      }
      if (workshopsOnly && !session.isWorkshop) {
        return false;
      }
      if (shortlistOnly && !shortlistSessionIds.includes(session.id)) {
        return false;
      }
      if (search.trim()) {
        const term = search.toLowerCase();
        const hit =
          session.title.toLowerCase().includes(term) ||
          (session.details ?? "").toLowerCase().includes(term) ||
          session.tags.some((tag) => tag.toLowerCase().includes(term));
        if (!hit) return false;
      }
      return true;
    });
  }, [
    sessions,
    search,
    selectedVenues,
    selectedDays,
    selectedTypes,
    selectedLevels,
    workshopsOnly,
    shortlistOnly,
    shortlistSessionIds
  ]);
  const relatedSessionCountByVenue = useMemo(() => {
    const counts = new Map<string, number>();
    for (const session of sessions) {
      if (selectedDays.length > 0 && (!session.dayOfWeek || !selectedDays.includes(session.dayOfWeek))) {
        continue;
      }
      if (selectedTypes.length > 0 && !selectedTypes.some((type) => matchesDanceType(session, type))) {
        continue;
      }
      if (selectedLevels.length > 0 && !selectedLevels.some((level) => matchesSessionLevel(session, level))) {
        continue;
      }
      if (workshopsOnly && !session.isWorkshop) {
        continue;
      }
      if (shortlistOnly && !shortlistSessionIds.includes(session.id)) {
        continue;
      }
      if (search.trim()) {
        const term = search.toLowerCase();
        const hit =
          session.title.toLowerCase().includes(term) ||
          (session.details ?? "").toLowerCase().includes(term) ||
          session.tags.some((tag) => tag.toLowerCase().includes(term));
        if (!hit) {
          continue;
        }
      }
      counts.set(session.venue, (counts.get(session.venue) ?? 0) + 1);
    }
    return counts;
  }, [sessions, search, selectedDays, selectedTypes, selectedLevels, workshopsOnly, shortlistOnly, shortlistSessionIds]);

  const dates = useMemo(
    () =>
      view === "week" ? getForwardDayWindow(anchorDate, loadedDayCount) : getMonthGridDates(anchorDate),
    [anchorDate, loadedDayCount, view]
  );
  const weekRangeStartValue = useMemo(() => format(anchorDate, "yyyy-MM-dd"), [anchorDate]);
  const weekRangeEndValue = useMemo(() => format(addDays(anchorDate, Math.max(loadedDayCount - 1, 0)), "yyyy-MM-dd"), [anchorDate, loadedDayCount]);
  const weekRangeLabel = useMemo(() => {
    if (view !== "week" || dates.length === 0) {
      return null;
    }
    const start = dates[0];
    const end = dates[dates.length - 1];
    if (!start || !end) {
      return null;
    }
    if (isSameMonth(start, end)) {
      return `${format(start, "d")} - ${format(end, "d MMM yyyy")}`;
    }
    return `${format(start, "d MMM")} - ${format(end, "d MMM yyyy")}`;
  }, [dates, view]);
  const visibleDates = useMemo(() => {
    if (view !== "week") {
      return dates;
    }
    const dayFilteredDates =
      selectedDays.length === 0 ? dates : dates.filter((date) => selectedDays.includes(format(date, "EEEE")));
    return dayFilteredDates;
  }, [dates, selectedDays, view]);
  const visibleDateIsos = useMemo(() => visibleDates.map((date) => format(date, "yyyy-MM-dd")), [visibleDates]);
  const weekMonthBandClassByIso = useMemo(() => {
    const classes = new Map<string, string>();
    if (view !== "week") {
      return classes;
    }
    const anchorMonth = startOfMonth(anchorDate);
    for (const date of visibleDates) {
      const iso = format(date, "yyyy-MM-dd");
      const monthDelta = differenceInCalendarMonths(startOfMonth(date), anchorMonth);
      classes.set(iso, monthDelta % 2 === 0 ? "bg-white" : "bg-slate-100");
    }
    return classes;
  }, [anchorDate, view, visibleDates]);
  const venueOptionCountByVenue = useMemo(() => {
    const counts = new Map<string, number>();
    for (const session of sessions) {
      if (selectedDays.length > 0 && (!session.dayOfWeek || !selectedDays.includes(session.dayOfWeek))) {
        continue;
      }
      if (selectedTypes.length > 0 && !selectedTypes.some((type) => matchesDanceType(session, type))) {
        continue;
      }
      if (selectedLevels.length > 0 && !selectedLevels.some((level) => matchesSessionLevel(session, level))) {
        continue;
      }
      if (workshopsOnly && !session.isWorkshop) {
        continue;
      }
      if (shortlistOnly && !shortlistSessionIds.includes(session.id)) {
        continue;
      }
      if (search.trim()) {
        const term = search.toLowerCase();
        const hit =
          session.title.toLowerCase().includes(term) ||
          (session.details ?? "").toLowerCase().includes(term) ||
          session.tags.some((tag) => tag.toLowerCase().includes(term));
        if (!hit) {
          continue;
        }
      }
      if (!visibleDateIsos.some((iso) => isSessionActiveOnDate(session, iso))) {
        continue;
      }
      counts.set(session.venue, (counts.get(session.venue) ?? 0) + 1);
    }
    return counts;
  }, [
    sessions,
    search,
    selectedDays,
    selectedLevels,
    selectedTypes,
    shortlistOnly,
    shortlistSessionIds,
    visibleDateIsos,
    workshopsOnly
  ]);
  const sortedVenueNamesByRelatedCount = useMemo(() => {
    return [...venueNames].sort((a, b) => {
      const aRelatedCount = venueOptionCountByVenue.get(a) ?? 0;
      const bRelatedCount = venueOptionCountByVenue.get(b) ?? 0;
      const aEnabled = aRelatedCount > 0 || selectedVenues.includes(a);
      const bEnabled = bRelatedCount > 0 || selectedVenues.includes(b);
      if (aEnabled !== bEnabled) {
        return Number(bEnabled) - Number(aEnabled);
      }

      const aVenuePriority = getVenuePriorityBucket(a);
      const bVenuePriority = getVenuePriorityBucket(b);
      if (aVenuePriority !== bVenuePriority) {
        return aVenuePriority - bVenuePriority;
      }
      if (aRelatedCount !== bRelatedCount) {
        return aRelatedCount - bRelatedCount;
      }
      return a.localeCompare(b);
    });
  }, [selectedVenues, venueNames, venueOptionCountByVenue]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }
    if (view !== "week" || loadedDayCount >= MAX_LOADED_CALENDAR_DAYS) {
      return;
    }
    const sentinel = weekLoadSentinelRef.current;
    const scrollRoot = weekScrollRef.current;
    if (!sentinel || !scrollRoot) {
      return;
    }

    const makeObserver = (horizontal: boolean) =>
      new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) {
            return;
          }
          setLoadedDayCount((n) => Math.min(n + LAZY_LOAD_DAY_CHUNK, MAX_LOADED_CALENDAR_DAYS));
        },
        { root: horizontal ? scrollRoot : null, rootMargin: "160px", threshold: 0 }
      );

    let observer = makeObserver(window.matchMedia("(min-width: 768px)").matches);
    observer.observe(sentinel);

    const mq = window.matchMedia("(min-width: 768px)");
    const onMqChange = () => {
      observer.disconnect();
      observer = makeObserver(mq.matches);
      observer.observe(sentinel);
    };
    mq.addEventListener("change", onMqChange);
    return () => {
      mq.removeEventListener("change", onMqChange);
      observer.disconnect();
    };
  }, [view, loadedDayCount, visibleDates.length]);

  useEffect(() => {
    if (view !== "week" || selectedVenues.length === 0 || filteredSessions.length === 0) {
      return;
    }

    const fullWindow = getForwardDayWindow(anchorDate, MAX_LOADED_CALENDAR_DAYS);
    for (let index = loadedDayCount; index < fullWindow.length; index += 1) {
      const date = fullWindow[index];
      if (!date) continue;
      const iso = format(date, "yyyy-MM-dd");
      const hasMatchOnDate = filteredSessions.some((session) => isSessionActiveOnDate(session, iso));
      if (hasMatchOnDate) {
        setLoadedDayCount(index + 1);
        return;
      }
    }
  }, [anchorDate, filteredSessions, loadedDayCount, selectedVenues, view]);

  const grouped = useMemo(() => groupByDate(filteredSessions, visibleDates), [filteredSessions, visibleDates]);
  const listingVenueCountByVenue = useMemo(() => {
    const counts = new Map<string, number>();
    for (const session of filteredSessions) {
      counts.set(session.venue, (counts.get(session.venue) ?? 0) + 1);
    }
    return counts;
  }, [filteredSessions]);
  const undatedSessions = useMemo(
    () => sortSessionsForDisplay(filteredSessions.filter((session) => isUndatedSession(session)), listingVenueCountByVenue),
    [filteredSessions, listingVenueCountByVenue]
  );
  const shortlistSet = useMemo(() => new Set(shortlistSessionIds), [shortlistSessionIds]);
  const sortedVenues = useMemo(() => {
    return venues
      .map((venue, index) => ({ venue, index }))
      .sort((a, b) => {
        const aVenuePriority = getVenuePriorityBucket(a.venue.name);
        const bVenuePriority = getVenuePriorityBucket(b.venue.name);
        if (aVenuePriority !== bVenuePriority) {
          return aVenuePriority - bVenuePriority;
        }
        const aFeatured = isFeaturedVenueName(a.venue.name);
        const bFeatured = isFeaturedVenueName(b.venue.name);
        const aRelatedCount = relatedSessionCountByVenue.get(a.venue.name) ?? 0;
        const bRelatedCount = relatedSessionCountByVenue.get(b.venue.name) ?? 0;
        if (aRelatedCount !== bRelatedCount) {
          return aRelatedCount - bRelatedCount;
        }
        if (aFeatured !== bFeatured) {
          return Number(bFeatured) - Number(aFeatured);
        }
        return a.index - b.index;
      })
      .map(({ venue }) => venue);
  }, [relatedSessionCountByVenue, venues]);

  const toggleShortlist = (sessionId: string) => {
    setShortlistSessionIds((current) => toggleValue(current, sessionId));
  };
  const clearFilters = () => {
    setSearch("");
    setSelectedVenues([]);
    setSelectedDays([]);
    setSelectedTypes([]);
    setSelectedLevels([]);
    setWorkshopsOnly(false);
    setShortlistOnly(false);
  };
  const clearShortlist = () => {
    setShortlistSessionIds([]);
  };
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count += 1;
    if (selectedVenues.length > 0) count += 1;
    if (selectedDays.length > 0) count += 1;
    if (selectedTypes.length > 0) count += 1;
    if (selectedLevels.length > 0) count += 1;
    if (workshopsOnly) count += 1;
    if (shortlistOnly) count += 1;
    return count;
  }, [search, selectedVenues.length, selectedDays.length, selectedTypes.length, selectedLevels.length, workshopsOnly, shortlistOnly]);

  const mapSearchQuery = useMemo(() => {
    if (mapVenue === "all") {
      // Google embed does not reliably support multi-place queries.
      // Keep "all" as a citywide overview and use exact venue queries when a single venue is selected.
      return "London dance classes";
    }
    const selectedVenueConfig = venues.find((venue) => venue.name === mapVenue);
    if (selectedVenueConfig) {
      return selectedVenueConfig.mapQuery ?? getVenueMapQuery(selectedVenueConfig.name);
    }
    return getVenueMapQuery(mapVenue);
  }, [mapVenue, venues]);

  const clearSummaryActionClass = "ml-auto h-7 rounded-sm px-2 text-[11px] sm:h-6";

  const tryLegacyCopy = (text: string) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  };

  const handleShare = async () => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("view", view);
    params.set("date", format(anchorDate, "yyyy-MM-dd"));
    if (search.trim()) params.set("q", search.trim());
    if (selectedVenues.length > 0) params.set("venue", selectedVenues.join(","));
    if (selectedDays.length > 0) params.set("day", selectedDays.join(","));
    if (selectedTypes.length > 0) params.set("type", selectedTypes.join(","));
    if (selectedLevels.length > 0) params.set("level", selectedLevels.join(","));
    if (workshopsOnly) params.set("workshops", "1");
    if (shortlistOnly) params.set("shortlist", "1");
    if (mapVenue !== "all") params.set("map", mapVenue);
    const shareUrl = `${window.location.origin}${pathname}?${params.toString()}`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: "London Dance Calendar",
          text: "London dance and movement classes",
          url: shareUrl
        });
        setShareFallbackUrl(null);
        setShareMessage("Shared");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareFallbackUrl(null);
        setShareMessage("Link copied");
        return;
      }

      if (tryLegacyCopy(shareUrl)) {
        setShareFallbackUrl(null);
        setShareMessage("Link copied");
        return;
      }

      setShareFallbackUrl(shareUrl);
      setShareMessage("Copy link manually");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      if (tryLegacyCopy(shareUrl)) {
        setShareFallbackUrl(null);
        setShareMessage("Link copied");
        return;
      }
      setShareFallbackUrl(shareUrl);
      setShareMessage("Copy link manually");
    }
  };

  const renderFilterSections = () => (
    <div className="space-y-3">
      <div className={`${editorialInsetClass} p-2`}>
        <details open>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold uppercase text-slate-800">
            <span>Search</span>
            <span className="h-px flex-1 bg-border" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={clearSummaryActionClass}
              disabled={!search.trim()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSearch("");
              }}
            >
              Clear
            </Button>
          </summary>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
            <Input
              placeholder="Search class, teacher, style"
              value={search}
              className="border-slate-900/35 bg-white pl-8"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </details>
      </div>
      <div className={`${editorialInsetClass} p-2`}>
        <details open>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold uppercase text-slate-800">
            <span>Level</span>
            <span className="h-px flex-1 bg-border" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={clearSummaryActionClass}
              disabled={selectedLevels.length === 0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedLevels([]);
              }}
            >
              Clear
            </Button>
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={selectedLevels.length === 0 ? "default" : "outline"}
              onClick={() => setSelectedLevels([])}
            >
              Any level
            </Button>
            {LEVELS.map((level) => (
              <Button
                key={level}
                type="button"
                size="sm"
                variant={selectedLevels.includes(level) ? "default" : "outline"}
                onClick={() => setSelectedLevels((current) => toggleValue(current, level))}
              >
                {level}
              </Button>
            ))}
          </div>
        </details>
      </div>
      <div className={`${editorialInsetClass} p-2`}>
        <details open>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold uppercase text-slate-800">
            <span>Type</span>
            <span className="h-px flex-1 bg-border" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={clearSummaryActionClass}
              disabled={selectedTypes.length === 0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedTypes([]);
              }}
            >
              Clear
            </Button>
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={selectedTypes.length === 0 ? "default" : "outline"}
              onClick={() => setSelectedTypes([])}
            >
              Any type
            </Button>
            {DANCE_TYPES.map((type) => (
              <Button
                key={type}
                type="button"
                size="sm"
                variant="outline"
                className={`${DANCE_TYPE_BADGE_CLASS[type]} ${
                  selectedTypes.includes(type) ? "ring-2 ring-primary ring-offset-1" : ""
                }`}
                onClick={() => setSelectedTypes((current) => toggleValue(current, type))}
              >
                {type}
              </Button>
            ))}
          </div>
        </details>
      </div>
      <div className={`${editorialInsetClass} p-2`}>
        <details open>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold uppercase text-slate-800">
            <span>Day</span>
            <span className="h-px flex-1 bg-border" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={clearSummaryActionClass}
              disabled={selectedDays.length === 0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedDays([]);
              }}
            >
              Clear
            </Button>
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={selectedDays.length === 0 ? "default" : "outline"}
              onClick={() => setSelectedDays([])}
            >
              Any day
            </Button>
            {ORDERED_DAYS.map((day) => (
              <Button
                key={day}
                type="button"
                size="sm"
                variant={selectedDays.includes(day) ? "default" : "outline"}
                onClick={() => setSelectedDays((current) => toggleValue(current, day))}
              >
                {day}
              </Button>
            ))}
          </div>
        </details>
      </div>
      <div className={`${editorialInsetClass} p-2`}>
        <details open>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold uppercase text-slate-800">
            <span>Venue</span>
            <span className="h-px flex-1 bg-border" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={clearSummaryActionClass}
              disabled={selectedVenues.length === 0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedVenues([]);
              }}
            >
              Clear
            </Button>
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={selectedVenues.length === 0 ? "default" : "outline"}
              onClick={() => setSelectedVenues([])}
            >
              Any venue
            </Button>
            {sortedVenueNamesByRelatedCount.map((venue) => {
              const relatedCount = venueOptionCountByVenue.get(venue) ?? 0;
              const isSelected = selectedVenues.includes(venue);
              const noRelatedSessions = relatedCount === 0;
              return (
                <Button
                  key={venue}
                  type="button"
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  className={noRelatedSessions && !isSelected ? "opacity-70" : undefined}
                  onClick={() => setSelectedVenues((current) => toggleValue(current, venue))}
                >
                  {venue}
                </Button>
              );
            })}
          </div>
        </details>
      </div>
      <div className={`${editorialInsetClass} p-2`}>
        <details open>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold uppercase text-slate-800">
            <span>Workshops</span>
            <span className="h-px flex-1 bg-border" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={clearSummaryActionClass}
              disabled={!workshopsOnly}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setWorkshopsOnly(false);
              }}
            >
              Clear
            </Button>
          </summary>
          <label className="mt-2 flex items-center gap-2 text-sm font-medium">
            <Checkbox
              aria-label="Workshops only"
              className="border-slate-900"
              checked={workshopsOnly}
              onChange={(e) => setWorkshopsOnly(e.target.checked)}
            />
            <span>Workshops only</span>
          </label>
        </details>
      </div>
      <div className={`${editorialInsetClass} p-2`}>
        <details open>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold uppercase text-slate-800">
            <span>Shortlist</span>
            <span className="h-px flex-1 bg-border" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={clearSummaryActionClass}
              disabled={!shortlistOnly}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShortlistOnly(false);
              }}
            >
              Clear
            </Button>
          </summary>
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={!shortlistOnly ? "default" : "outline"}
                onClick={() => setShortlistOnly(false)}
              >
                All classes
              </Button>
              <Button
                size="sm"
                variant={shortlistOnly ? "default" : "outline"}
                disabled={shortlistSessionIds.length === 0}
                onClick={() => setShortlistOnly(true)}
              >
                Shortlist ({shortlistSessionIds.length})
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters} disabled={activeFilterCount === 0}>
                Clear filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearShortlist}
                disabled={shortlistSessionIds.length === 0}
              >
                Clear shortlist ({shortlistSessionIds.length})
              </Button>
            </div>
          </div>
        </details>
      </div>
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-[1500px] px-3 py-5 sm:px-5 md:px-8">
      <header className="border-y-2 border-slate-950 py-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-primary">London Dance Calendar</p>
            <h1 className="mt-1 max-w-4xl text-4xl font-black leading-[0.95] tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
              Find dance classes in London — fast
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-slate-700">
              <span>Filter by style, level, date, and location.</span>
              {listingsUpdatedText ? <span>{listingsUpdatedText}</span> : null}
              <span>Listings are aggregated from studio sources.</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            {typeof classCount === "number" && typeof venueCount === "number" ? (
              <div className="grid grid-cols-2 border border-slate-950 bg-white text-center shadow-[4px_4px_0_rgba(15,23,42,0.18)]">
                <div className="border-r border-slate-950 px-4 py-2">
                  <p className="text-2xl font-black leading-none">{classCount.toLocaleString("en-GB")}+</p>
                  <p className="text-[11px] font-bold uppercase text-slate-600">classes</p>
                </div>
                <div className="px-4 py-2">
                  <p className="text-2xl font-black leading-none">{venueCount}</p>
                  <p className="text-[11px] font-bold uppercase text-slate-600">venues</p>
                </div>
              </div>
            ) : null}
            <nav aria-label="Primary" className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className={editorialButtonClass} onClick={handleShare}>
                <Share2 className={iconClass} aria-hidden />
                Share
              </Button>
              <Button asChild className={editorialButtonClass}>
                <Link href="/">
                  <CalendarDays className={iconClass} aria-hidden />
                  Calendar
                </Link>
              </Button>
              <Button variant="outline" className={editorialButtonClass} asChild>
                <Link href="/insights">Insights</Link>
              </Button>
              <Button variant="outline" className={editorialButtonClass} asChild>
                <Link href="/studios">Studios</Link>
              </Button>
            </nav>
          </div>
        </div>
        {shareMessage ? <p className="mt-3 text-sm font-medium text-muted-foreground">{shareMessage}</p> : null}
        {shareFallbackUrl ? (
          <Input
            readOnly
            value={shareFallbackUrl}
            onFocus={(event) => event.currentTarget.select()}
            aria-label="Share link"
            className="mt-3 max-w-2xl border-slate-900 bg-white"
          />
        ) : null}
        <SiteSocialLinks className="mt-3" />
        {seoSnapshot}
      </header>

      <div className="mt-5 space-y-4">
        <div className="grid gap-4 lg:grid-cols-[290px_minmax(0,1fr)] lg:items-start">
            <aside className="hidden lg:block">
              <div className={`sticky top-4 overflow-hidden ${editorialPanelClass}`}>
                <div className="border-b border-slate-950 bg-slate-950 px-3 py-2 text-white">
                  <p className="flex items-center gap-2 text-sm font-black uppercase">
                    <ListFilter className={iconClass} aria-hidden />
                    Filters
                  </p>
                  <p className="text-xs text-white/70">
                    Narrow by class, dance type, venue, day, and saved lists.
                  </p>
                </div>
                <div className="p-2 transition-all duration-200 ease-out">
                  {renderFilterSections()}
                </div>
              </div>
            </aside>

            <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
              <DialogContent className="left-0 top-0 h-dvh w-[340px] max-w-[92vw] translate-y-0 rounded-none border-y-0 border-l-0 border-r-2 border-slate-950 p-0 transition-transform duration-300 data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0 lg:hidden">
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-950 bg-slate-950 p-4 text-white">
                    <DialogHeader>
                      <DialogTitle>Filters</DialogTitle>
                      <DialogDescription className="text-white/70">
                        Narrow by class, dance type, venue, day, and saved lists.
                      </DialogDescription>
                    </DialogHeader>
                    <Button variant="outline" size="sm" className="border-white/60 bg-transparent text-white hover:bg-white hover:text-slate-950" onClick={() => setFiltersOpen(false)}>
                      Close
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {renderFilterSections()}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <section id="browse-classes" className="scroll-mt-8 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-slate-950 pb-2">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-normal">Find dance classes</h2>
                  <p className="text-sm text-muted-foreground" aria-live="polite">
                    {sessionsLoading ? "Loading latest classes" : `Showing ${filteredSessions.length} classes`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-sm border-slate-900 bg-white text-slate-950">{activeFilterCount} filters</Badge>
                  <Button className={`lg:hidden ${editorialButtonClass}`} variant="outline" onClick={() => setFiltersOpen(true)}>
                    <Filter className={iconClass} aria-hidden />
                  Filters
                  </Button>
                  <Button variant={mode === "calendar" ? "default" : "outline"} className={editorialButtonClass} onClick={() => setMode("calendar")}>
                    <CalendarDays className={iconClass} aria-hidden />
                    Calendar
                  </Button>
                  <Button variant={mode === "venues" ? "default" : "outline"} className={editorialButtonClass} onClick={() => setMode("venues")}>
                    <Building2 className={iconClass} aria-hidden />
                    Venues
                  </Button>
                  <Button variant={mode === "map" ? "default" : "outline"} className={editorialButtonClass} onClick={() => setMode("map")}>
                    <MapPin className={iconClass} aria-hidden />
                    Map
                  </Button>
                </div>
              </div>
              {sessionsLoading ? <CalendarLoadingState /> : null}
              {sessionsError ? (
                <div className="border border-destructive/60 bg-white p-3 text-sm font-medium text-destructive" role="status">
                  {sessionsError}
                </div>
              ) : null}
            {mode === "calendar" && (
              <>
                <div className={`${editorialPanelClass} flex flex-wrap items-center gap-2 p-2`}>
                  <Button
                    variant="outline"
                    className={editorialButtonClass}
                    onClick={() => setAnchorDate((d) => (view === "week" ? subDays(d, 7) : subMonths(d, 1)))}
                  >
                    <ChevronLeft className={iconClass} aria-hidden />
                    Previous
                  </Button>
                  <Button variant="outline" className={editorialButtonClass} onClick={() => setAnchorDate(startOfDay(new Date()))}>
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    className={editorialButtonClass}
                    onClick={() => setAnchorDate((d) => (view === "week" ? addDays(d, 7) : addMonths(d, 1)))}
                  >
                    Next
                    <ChevronRight className={iconClass} aria-hidden />
                  </Button>
                  {view === "week" ? (
                    <>
                      <Badge className="rounded-sm border-slate-900 bg-white text-slate-950">From {format(anchorDate, "EEE d MMM yyyy")}</Badge>
                      {weekRangeLabel ? <Badge className="rounded-sm border-slate-900 bg-secondary text-secondary-foreground">Showing {weekRangeLabel}</Badge> : null}
                    </>
                  ) : (
                    <Badge className="rounded-sm border-slate-900 bg-white text-slate-950">{format(anchorDate, "MMMM yyyy")}</Badge>
                  )}
                  {view === "week" ? (
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                      <label htmlFor="range-start" className="sr-only">
                        Week view range start date
                      </label>
                      <Input
                        id="range-start"
                        type="date"
                        value={weekRangeStartValue}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          if (!value) return;
                          const nextAnchor = parseISO(value);
                          if (Number.isNaN(nextAnchor.getTime())) return;
                          setAnchorDate(startOfDay(nextAnchor));
                          setView("week");
                        }}
                        className="w-full border-slate-900/45 bg-white sm:w-[170px]"
                        aria-label="Range start date"
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <label htmlFor="range-end" className="sr-only">
                        Week view range end date
                      </label>
                      <Input
                        id="range-end"
                        type="date"
                        value={weekRangeEndValue}
                        min={weekRangeStartValue}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          if (!value) return;
                          const nextEnd = parseISO(value);
                          if (Number.isNaN(nextEnd.getTime())) return;
                          const inclusiveDays = differenceInCalendarDays(startOfDay(nextEnd), anchorDate) + 1;
                          const boundedDays = Math.max(1, Math.min(MAX_LOADED_CALENDAR_DAYS, inclusiveDays));
                          setLoadedDayCount(boundedDays);
                          setView("week");
                        }}
                        className="w-full border-slate-900/45 bg-white sm:w-[170px]"
                        aria-label="Range end date"
                      />
                    </div>
                  ) : null}
                  <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
                    <Button variant={view === "week" ? "default" : "outline"} className={editorialButtonClass} onClick={() => setView("week")}>
                      Week
                    </Button>
                    <Button variant={view === "month" ? "default" : "outline"} className={editorialButtonClass} onClick={() => setView("month")}>
                      Month
                    </Button>
                  </div>
                </div>

                <div
                  ref={view === "week" ? weekScrollRef : undefined}
                  className={view === "week" ? "overflow-x-auto pb-2" : ""}
                  aria-busy={sessionsLoading}
                >
                  <div
                    className={
                      view === "week"
                        ? "flex w-full flex-col gap-3 md:w-max md:flex-row md:items-stretch"
                        : "grid grid-cols-1 gap-3 md:grid-cols-7"
                    }
                  >
                    {visibleDates.map((date, index) => {
                      const iso = format(date, "yyyy-MM-dd");
                      const sessions = sortSessionsForDisplay(grouped.get(iso) ?? [], listingVenueCountByVenue);
                      const inMonth = isSameMonth(date, anchorDate);
                      const isToday = isSameDay(date, new Date());
                      const showMonthMarker = view === "week" && (index === 0 || !isSameMonth(date, visibleDates[index - 1]));
                      const loadingRowCount = LOADING_CARD_ROW_COUNTS[index % LOADING_CARD_ROW_COUNTS.length];
                      return (
                        <Card
                          key={iso}
                          className={`min-w-0 w-full border-slate-950 bg-white shadow-none ${
                            view === "week" ? "md:min-w-[235px] md:max-w-[235px] md:shrink-0" : ""
                          } ${
                            view === "month" && !inMonth ? "opacity-55" : ""
                          } ${
                            view === "week" ? weekMonthBandClassByIso.get(iso) ?? "bg-white" : ""
                          } ${isToday ? "border-primary bg-sky-50 ring-2 ring-primary" : ""}`}
                        >
                          <CardHeader className="border-b border-slate-950 p-2">
                            <CardTitle className="flex items-baseline justify-between gap-2 text-sm" aria-label={format(date, "EEE d")}>
                              <span className="font-black uppercase">{format(date, "EEE")}</span>
                              <span className="text-2xl font-black leading-none">{format(date, "d")}</span>
                            </CardTitle>
                            {isToday ? <Badge className="w-fit rounded-sm border-slate-950 bg-accent text-accent-foreground">Today</Badge> : null}
                            {showMonthMarker ? (
                              <p className="text-[11px] font-bold uppercase text-muted-foreground">
                                {format(date, "MMMM yyyy")}
                              </p>
                            ) : null}
                          </CardHeader>
                          <CardContent className="space-y-2 p-2">
                            {sessionsLoading ? <CalendarDayLoadingSkeleton count={loadingRowCount} /> : null}
                            {!sessionsLoading && (view === "month" ? sessions.slice(0, 3) : sessions).map((session, index) => {
                              if (isGagaSession(session)) {
                                return (
                                  <GagaBoycottCard
                                    key={`${session.id}-${iso}-${session.bookingUrl}-${index}`}
                                    session={session}
                                    onOpen={() => setSelectedSession(session)}
                                  />
                                );
                              }
                              const types = inferDanceTypes(session);
                              const primaryType = types[0] ?? "Other";
                              const featured = isFeaturedSession(session);
                              return (
                                <div
                                  key={`${session.id}-${iso}-${session.bookingUrl}-${index}`}
                                  className={`border border-l-4 border-slate-900/25 bg-white p-2 text-xs transition-colors hover:bg-secondary/45 ${
                                    featured
                                      ? "border-amber-500 border-l-amber-500 bg-amber-50 ring-1 ring-amber-400"
                                      : DANCE_TYPE_CARD_CLASS[primaryType]
                                  }`}
                                >
                                  <button
                                    onClick={() => setSelectedSession(session)}
                                    className="w-full text-left hover:text-foreground/90"
                                  >
                                    {featured ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-700">
                                        <Star className="h-3 w-3 fill-current" aria-hidden />
                                        Featured
                                      </span>
                                    ) : null}
                                    <p className="font-bold leading-snug text-slate-950">{session.title}</p>
                                    <p className="mt-1 flex items-center gap-1 font-medium text-slate-700">
                                      <Clock className="h-3 w-3" aria-hidden />
                                      {session.startTime || session.endTime
                                        ? formatTimeRange(session.startTime, session.endTime)
                                        : session.dayOfWeek ?? "Time TBC"}
                                    </p>
                                    <p className="mt-0.5 text-slate-600">{session.venue}</p>
                                  </button>
                                  <div className="mt-2 flex justify-end">
                                    <Button
                                      size="sm"
                                      variant={shortlistSet.has(session.id) ? "default" : "outline"}
                                      className="h-7 rounded-sm px-2 text-[11px] transition-colors sm:h-6"
                                      onClick={() => toggleShortlist(session.id)}
                                      aria-label={shortlistSet.has(session.id) ? `Remove from shortlist: ${session.title}` : `Add to shortlist: ${session.title}`}
                                    >
                                      <Bookmark className="h-3 w-3" aria-hidden />
                                      {shortlistSet.has(session.id) ? "Saved" : "Shortlist"}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                            {!sessionsLoading && sessions.length === 0 && <p className="border border-dashed border-slate-900/25 p-2 text-xs text-muted-foreground">No classes</p>}
                            {!sessionsLoading && view === "month" && sessions.length > 3 && (
                              <p className="text-xs text-muted-foreground">+{sessions.length - 3} more</p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                    {view === "week" && loadedDayCount < MAX_LOADED_CALENDAR_DAYS ? (
                      <div
                        ref={weekLoadSentinelRef}
                        className="pointer-events-none flex min-h-[1px] w-full shrink-0 md:h-auto md:min-h-[80px] md:w-6"
                        aria-hidden
                      />
                    ) : null}
                  </div>
                </div>

                {undatedSessions.length > 0 && (
                  <Card className="border-slate-950 bg-white shadow-none">
                    <CardHeader className="border-b border-slate-950 p-3">
                      <CardTitle className="text-sm font-black uppercase">Undated classes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 p-2">
                      {undatedSessions.map((session, index) => {
                        if (isGagaSession(session)) {
                          return (
                            <GagaBoycottCard
                              key={`${session.id}-${session.bookingUrl}-${index}`}
                              session={session}
                              onOpen={() => setSelectedSession(session)}
                            />
                          );
                        }
                        const types = inferDanceTypes(session);
                        const primaryType = types[0] ?? "Other";
                        const featured = isFeaturedSession(session);
                        return (
                          <div
                            key={`${session.id}-${session.bookingUrl}-${index}`}
                            className={`border border-l-4 border-slate-900/25 bg-white p-2 text-xs transition-colors hover:bg-secondary/45 ${
                              featured
                                ? "border-amber-500 border-l-amber-500 bg-amber-50 ring-1 ring-amber-400"
                                : DANCE_TYPE_CARD_CLASS[primaryType]
                            }`}
                          >
                            <button
                              onClick={() => setSelectedSession(session)}
                              className="w-full text-left hover:text-foreground/90"
                            >
                              {featured ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-700">
                                  <Star className="h-3 w-3 fill-current" aria-hidden />
                                  Featured
                                </span>
                              ) : null}
                              <p className="font-bold leading-snug text-slate-950">{session.title}</p>
                              <p className="mt-1 text-slate-700">
                                {session.dayOfWeek ?? "Day TBC"} • {formatTimeRange(session.startTime, session.endTime)}
                              </p>
                              <p className="mt-0.5 text-slate-600">{session.venue}</p>
                            </button>
                            <div className="mt-2 flex justify-end">
                              <Button
                                size="sm"
                                variant={shortlistSet.has(session.id) ? "default" : "outline"}
                                className="h-7 rounded-sm px-2 text-[11px] transition-colors sm:h-6"
                                onClick={() => toggleShortlist(session.id)}
                                aria-label={
                                  shortlistSet.has(session.id)
                                    ? `Remove from shortlist: ${session.title}`
                                    : `Add to shortlist: ${session.title}`
                                }
                              >
                                <Bookmark className="h-3 w-3" aria-hidden />
                                {shortlistSet.has(session.id) ? "Saved" : "Shortlist"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {mode === "calendar" && !sessionsLoading && filteredSessions.length === 0 && (
              <div className="border border-dashed border-slate-950 bg-white p-4 text-sm text-muted-foreground">
                No matching classes. Try clearing filters or broadening search.
              </div>
            )}

            {mode === "venues" && (
              <div className="space-y-3">
                <Card className={`${editorialPanelClass} shadow-none`}>
                  <CardHeader className="space-y-2 border-b border-slate-950 p-3">
                    <CardTitle className="text-base font-black uppercase">Spotted an error or missing class?</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Send feedback on the contact page and I&apos;ll try to fix issues when I can.
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <Button asChild size="sm" className={editorialButtonClass}>
                      <Link href={"/contact" as Route} prefetch={false}>
                        Open contact page
                      </Link>
                    </Button>
                    <SiteSocialLinks />
                  </CardContent>
                </Card>
                <div className="grid gap-2">
                  {sortedVenues.map((venue) => {
                    const relatedCount = relatedSessionCountByVenue.get(venue.name) ?? 0;
                    const isMuted = relatedCount === 0;
                    const status = getVenueStatus(venue);
                    const featured = isFeaturedVenueName(venue.name);
                    return (
                      <Card
                        key={venue.name}
                        className={`border-slate-950 bg-white shadow-none ${isMuted ? "opacity-65" : ""} ${featured ? "border-amber-500 ring-2 ring-amber-400" : ""}`.trim()}
                      >
                        <CardHeader className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <CardTitle className="text-base font-black">{venue.name}</CardTitle>
                              {featured ? (
                                <Badge className="rounded-sm border-amber-500 bg-amber-50 text-amber-700">
                                  <Star className="h-3 w-3 fill-current" aria-hidden />
                                  Featured
                                </Badge>
                              ) : null}
                              <Badge variant={status.variant} className="rounded-sm">{status.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {relatedCount} matching now · {venue.count === 0 ? "No sessions found on last scrape" : `${venue.count} sessions last scrape`}
                              {venue.lastSuccessAt
                                ? ` · updated ${format(new Date(venue.lastSuccessAt), "d MMM yyyy, HH:mm")}`
                                : ""}
                            </p>
                            {!venue.ok && venue.lastError ? (
                              <p className="text-xs font-medium text-destructive">{venue.lastError}</p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2 md:justify-end">
                          <Button variant="outline" className={editorialButtonClass} asChild>
                            <TrackedOutboundLink
                              href={hrefForVenueSite(venue)}
                              analyticsKind="venue"
                              destHost={extractOutboundHostname(venue.sourceUrl)}
                            >
                              <ExternalLink className={iconClass} aria-hidden />
                              Venue site
                            </TrackedOutboundLink>
                          </Button>
                          <Button variant="outline" className={editorialButtonClass} asChild>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                venue.mapQuery ?? getVenueMapQuery(venue.name)
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <MapPin className={iconClass} aria-hidden />
                              Open map
                            </a>
                          </Button>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {mode === "map" && (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Select value={mapVenue} onValueChange={setMapVenue}>
                    <SelectTrigger className="border-slate-950 bg-white">
                      <SelectValue placeholder="Choose venue for map" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All venues (London dance classes)</SelectItem>
                      {sortedVenueNamesByRelatedCount.map((venue) => (
                        <SelectItem key={venue} value={venue}>
                          {venue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className={editorialButtonClass} asChild>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapSearchQuery)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin className={iconClass} aria-hidden />
                      Open in Google Maps
                    </a>
                  </Button>
                </div>
                <div className={`${editorialPanelClass} space-y-2 overflow-hidden p-3`}>
                  <p className="text-xs text-muted-foreground">
                    Venue map is under construction. Locations may be incomplete or change without notice.
                  </p>
                  <iframe
                    title="Venue map"
                    src={`https://www.google.com/maps?q=${encodeURIComponent(mapSearchQuery)}&output=embed`}
                    className="h-[360px] w-full border border-slate-950 md:h-[520px]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            )}
            </section>

            {mode !== "venues" && (
              <section aria-label="Contact" className={`${editorialPanelClass} mt-8 px-4 py-3 text-sm`}>
                <p className="mb-2 text-sm font-black uppercase">Spotted an error or missing class?</p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Send feedback on the contact page and I&apos;ll try to fix issues when I can.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <Button asChild size="sm" className={editorialButtonClass}>
                    <Link href={"/contact" as Route} prefetch={false}>
                      Open contact page
                    </Link>
                  </Button>
                  <SiteSocialLinks />
                </div>
              </section>
            )}
          </div>
        </div>

      <Dialog open={Boolean(selectedSession)} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto border-2 border-slate-950 bg-white p-0 shadow-[8px_8px_0_rgba(15,23,42,0.22)] sm:max-w-2xl">
          {selectedSession && (
            isGagaSession(selectedSession) ? (
              <div className="p-4 sm:p-6">
                <GagaSessionDialogContent
                  session={selectedSession}
                  shortlistSet={shortlistSet}
                  toggleShortlist={toggleShortlist}
                />
              </div>
            ) : (
              <>
                <DialogHeader className="border-b border-slate-950 bg-slate-950 p-4 text-white sm:p-5">
                  <DialogTitle className="text-2xl font-black leading-tight sm:text-3xl">{selectedSession.title}</DialogTitle>
                  <DialogDescription className="flex flex-wrap gap-x-3 gap-y-1 pt-2 text-sm font-medium text-white/75">
                    <span>{selectedSession.venue}</span>
                    <span>{selectedSession.dayOfWeek ?? "Day TBC"}</span>
                    <span>{formatTimeRange(selectedSession.startTime, selectedSession.endTime)}</span>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 p-4 text-sm sm:p-5">
                  <div className="grid gap-2 border border-slate-950/25 bg-secondary/35 p-3 sm:grid-cols-3">
                    <p>
                      <span className="block text-[11px] font-black uppercase text-muted-foreground">Venue</span>
                      {selectedSession.venue}
                    </p>
                    <p>
                      <span className="block text-[11px] font-black uppercase text-muted-foreground">When</span>
                      {selectedSession.dayOfWeek ?? "Day TBC"} · {formatTimeRange(selectedSession.startTime, selectedSession.endTime)}
                    </p>
                    <p>
                      <span className="block text-[11px] font-black uppercase text-muted-foreground">Date range</span>
                      {selectedSession.startDate ?? "Open"} to {selectedSession.endDate ?? "Open"}
                    </p>
                  </div>
                  <p className="text-base leading-relaxed">{selectedSession.details ?? "No additional description."}</p>
                  <div className="flex flex-wrap gap-2">
                    {inferDanceTypes(selectedSession).map((type) => (
                      <Badge key={`${selectedSession.id}-${type}`} className={DANCE_TYPE_BADGE_CLASS[type]}>
                        {type}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={shortlistSet.has(selectedSession.id) ? "default" : "outline"}
                      className={editorialButtonClass}
                      onClick={() => toggleShortlist(selectedSession.id)}
                    >
                      <Bookmark className={iconClass} aria-hidden />
                      {shortlistSet.has(selectedSession.id) ? "Remove from shortlist" : "Save to shortlist"}
                    </Button>
                    <Button asChild className={editorialButtonClass}>
                      <TrackedOutboundLink
                        href={hrefForOutboundBooking(selectedSession)}
                        analyticsKind="booking"
                        destHost={extractOutboundHostname(selectedSession.bookingUrl)}
                      >
                        <ExternalLink className={iconClass} aria-hidden />
                        Booking
                      </TrackedOutboundLink>
                    </Button>
                    {canAddSessionToCalendar(selectedSession) ? (
                      <Button variant="outline" className={editorialButtonClass} asChild>
                        <a href={`/api/classes/${encodeURIComponent(selectedSession.id)}/calendar`}>
                          <CalendarDays className={iconClass} aria-hidden />
                          Add to calendar
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" className={editorialButtonClass} disabled>
                        Add to calendar unavailable
                      </Button>
                    )}
                    <Button variant="outline" className={editorialButtonClass} asChild>
                      <TrackedOutboundLink
                        href={hrefForOutboundSource(selectedSession)}
                        analyticsKind="source"
                        destHost={extractOutboundHostname(selectedSession.sourceUrl)}
                      >
                        <ExternalLink className={iconClass} aria-hidden />
                        Source
                      </TrackedOutboundLink>
                    </Button>
                  </div>
                </div>
              </>
            )
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
