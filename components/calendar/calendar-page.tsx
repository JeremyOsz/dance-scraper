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
import { isBigStudioVenueName, sortVenueRecordsForUi } from "@/lib/venue-order";
import { SiteSocialLinks } from "@/components/site-social-links";

const SHORTLIST_STORAGE_KEY = "dance-scraper.shortlist-session-ids";
const INITIAL_WEEK_DAY_COUNT = 7;
const LAZY_LOAD_DAY_CHUNK = 7;
const MAX_LOADED_CALENDAR_DAYS = 56;
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
  Contemporary: "border-sky-200 bg-sky-50/70",
  Ballet: "border-rose-200 bg-rose-50/70",
  Improv: "border-emerald-200 bg-emerald-50/70",
  "Contact Improv": "border-teal-200 bg-teal-50/70",
  "Ecstatic Dance/ 5Rythms": "border-amber-200 bg-amber-50/70",
  Salsa: "border-red-200 bg-red-50/70",
  Bachata: "border-pink-200 bg-pink-50/70",
  Butoh: "border-zinc-300 bg-zinc-100/80",
  Somatic: "border-lime-200 bg-lime-50/70",
  "Hip Hop": "border-violet-200 bg-violet-50/70",
  "Yoga/Pilates": "border-cyan-200 bg-cyan-50/70",
  Jazz: "border-orange-200 bg-orange-50/70",
  House: "border-indigo-200 bg-indigo-50/70",
  "Commercial/Heels": "border-fuchsia-200 bg-fuchsia-50/70",
  "Ballroom/Tango": "border-yellow-200 bg-yellow-50/70",
  Other: "border-border bg-secondary/40"
};
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
  initialSessions: DanceSessionOutbound[];
  venues: VenueCard[];
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

export function CalendarPage({ initialSessions, venues }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
    return initialSessions.filter((session) => {
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
    initialSessions,
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
    for (const session of initialSessions) {
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
  }, [initialSessions, search, selectedDays, selectedTypes, selectedLevels, workshopsOnly, shortlistOnly, shortlistSessionIds]);

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
      classes.set(iso, monthDelta % 2 === 0 ? "bg-card" : "bg-slate-100");
    }
    return classes;
  }, [anchorDate, view, visibleDates]);
  const venueOptionCountByVenue = useMemo(() => {
    const counts = new Map<string, number>();
    for (const session of initialSessions) {
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
    initialSessions,
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

      const aBigStudio = isBigStudioVenueName(a);
      const bBigStudio = isBigStudioVenueName(b);
      if (aBigStudio !== bBigStudio) {
        return Number(aBigStudio) - Number(bBigStudio);
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
        const aBigStudio = isBigStudioVenueName(a.venue.name);
        const bBigStudio = isBigStudioVenueName(b.venue.name);
        if (aBigStudio !== bBigStudio) {
          return Number(aBigStudio) - Number(bBigStudio);
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

  const clearSummaryActionClass = "ml-auto h-8 px-3 text-xs sm:h-6 sm:px-2";

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
      <div className="rounded-md border border-input bg-background p-2">
        <details open>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
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
          <div className="mt-2">
            <Input
              placeholder="Search class, teacher, style"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </details>
      </div>
      <div className="rounded-md border border-input bg-background p-2">
        <details open>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
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
          <div className="mt-2 flex flex-wrap gap-2">
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
      <div className="rounded-md border border-input bg-background p-2">
        <details open>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
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
          <div className="mt-2 flex flex-wrap gap-2">
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
      <div className="rounded-md border border-input bg-background p-2">
        <details open>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
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
          <div className="mt-2 flex flex-wrap gap-2">
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
      <div className="rounded-md border border-input bg-background p-2">
        <details open>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
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
          <div className="mt-2 flex flex-wrap gap-2">
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
                  disabled={noRelatedSessions && !isSelected}
                  className={noRelatedSessions && !isSelected ? "opacity-50" : undefined}
                  onClick={() => setSelectedVenues((current) => toggleValue(current, venue))}
                >
                  {venue}
                </Button>
              );
            })}
          </div>
        </details>
      </div>
      <div className="rounded-md border border-input bg-background p-2">
        <details open>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
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
          <label className="mt-2 flex items-center gap-2 text-sm">
            <Checkbox
              aria-label="Workshops only"
              checked={workshopsOnly}
              onChange={(e) => setWorkshopsOnly(e.target.checked)}
            />
            <span>Workshops only</span>
          </label>
        </details>
      </div>
      <div className="rounded-md border border-input bg-background p-2">
        <details open>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
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
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      <h1 className="sr-only">London dance classes calendar</h1>
      <Card className="border-none bg-transparent shadow-none">
        <CardHeader className="px-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-3xl tracking-tight">London Dance Calendar</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleShare}>
                Share
              </Button>
              <Button asChild>
                <Link href="/">Calendar</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/insights">Insights</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/studios">Studios</Link>
              </Button>
            </div>
          </div>
          {shareMessage ? <p className="text-sm text-muted-foreground">{shareMessage}</p> : null}
          {shareFallbackUrl ? (
            <Input
              readOnly
              value={shareFallbackUrl}
              onFocus={(event) => event.currentTarget.select()}
              aria-label="Share link"
            />
          ) : null}
          <p className="text-sm text-muted-foreground">
            London Dance Calendar is a single place to discover adult dance and movement classes across London. Use
            filters for style, level, location, and date to quickly find relevant sessions. Listings are aggregated
            from multiple studio sources and refreshed regularly, though occasional inaccuracies may occur.
          </p>
          <SiteSocialLinks className="mt-2" />
        </CardHeader>
        <CardContent className="space-y-4 px-0">
          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
            <aside className="hidden lg:block">
              <div className="sticky top-4 overflow-hidden rounded-lg border border-input bg-card shadow-sm">
                <div className="border-b px-3 py-2">
                  <p className="text-sm font-medium">Filters</p>
                  <p className="text-xs text-muted-foreground">
                    Narrow by class, dance type, venue, day, and saved lists.
                  </p>
                </div>
                <div className="p-3 transition-all duration-200 ease-out">
                  {renderFilterSections()}
                </div>
              </div>
            </aside>

            <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
              <DialogContent className="left-0 top-0 h-dvh w-[340px] max-w-[92vw] translate-y-0 rounded-none border-y-0 border-l-0 p-0 transition-transform duration-300 data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0 lg:hidden">
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3 border-b p-4">
                    <DialogHeader>
                      <DialogTitle>Filters</DialogTitle>
                      <DialogDescription>
                        Narrow by class, dance type, venue, day, and saved lists.
                      </DialogDescription>
                    </DialogHeader>
                    <Button variant="outline" size="sm" onClick={() => setFiltersOpen(false)}>
                      Close
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {renderFilterSections()}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <section className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm">
                <Button className="lg:hidden" variant="outline" onClick={() => setFiltersOpen(true)}>
                  Filters
                </Button>
                <Badge variant="secondary">{activeFilterCount} filters</Badge>
                <Button variant={mode === "calendar" ? "default" : "outline"} onClick={() => setMode("calendar")}>
                  Calendar
                </Button>
                <Button variant={mode === "venues" ? "default" : "outline"} onClick={() => setMode("venues")}>
                  Venues
                </Button>
                <Button variant={mode === "map" ? "default" : "outline"} onClick={() => setMode("map")}>
                  Map
                </Button>
                <span className="w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto sm:text-sm">
                  Showing {filteredSessions.length} classes
                </span>
              </div>
            {mode === "calendar" && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setAnchorDate((d) => (view === "week" ? subDays(d, 7) : subMonths(d, 1)))}
                  >
                    Previous
                  </Button>
                  <Button variant="outline" onClick={() => setAnchorDate(startOfDay(new Date()))}>
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setAnchorDate((d) => (view === "week" ? addDays(d, 7) : addMonths(d, 1)))}
                  >
                    Next
                  </Button>
                  {view === "week" ? (
                    <>
                      <Badge variant="secondary">From {format(anchorDate, "EEE d MMM yyyy")}</Badge>
                      {weekRangeLabel ? <Badge variant="outline">Showing {weekRangeLabel}</Badge> : null}
                    </>
                  ) : (
                    <Badge variant="secondary">{format(anchorDate, "MMMM yyyy")}</Badge>
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
                        className="w-full sm:w-[170px]"
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
                        className="w-full sm:w-[170px]"
                        aria-label="Range end date"
                      />
                    </div>
                  ) : null}
                  <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
                    <Button variant={view === "week" ? "default" : "outline"} onClick={() => setView("week")}>
                      Week
                    </Button>
                    <Button variant={view === "month" ? "default" : "outline"} onClick={() => setView("month")}>
                      Month
                    </Button>
                  </div>
                </div>

                <div ref={view === "week" ? weekScrollRef : undefined} className={view === "week" ? "overflow-x-auto pb-2" : ""}>
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
                      return (
                        <Card
                          key={iso}
                          className={`min-w-0 w-full ${
                            view === "week" ? "md:min-w-[220px] md:max-w-[220px] md:shrink-0" : ""
                          } ${
                            view === "month" && !inMonth ? "opacity-55" : ""
                          } ${
                            view === "week" ? weekMonthBandClassByIso.get(iso) ?? "bg-card" : ""
                          } ${isToday ? "border-primary/60 bg-primary/5 ring-1 ring-primary/40" : ""}`}
                        >
                          <CardHeader className="p-3">
                            <CardTitle className="flex items-center gap-2 text-sm">
                              <span>{format(date, "EEE d")}</span>
                              {isToday ? <Badge variant="secondary">Today</Badge> : null}
                            </CardTitle>
                            {showMonthMarker ? (
                              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                {format(date, "MMMM yyyy")}
                              </p>
                            ) : null}
                          </CardHeader>
                          <CardContent className="space-y-2 p-3 pt-0">
                            {(view === "month" ? sessions.slice(0, 3) : sessions).map((session, index) => {
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
                                  className={`rounded-md border p-2 text-xs ${
                                    featured
                                      ? "border-amber-400 bg-amber-50 ring-1 ring-amber-300"
                                      : DANCE_TYPE_CARD_CLASS[primaryType]
                                  }`}
                                >
                                  <button
                                    onClick={() => setSelectedSession(session)}
                                    className="w-full text-left hover:text-foreground/90"
                                  >
                                    {featured ? (
                                      <span className="text-[10px] font-semibold text-amber-600">★ Featured</span>
                                    ) : null}
                                    <p className="font-medium">{session.title}</p>
                                    <p className="text-muted-foreground">
                                      {session.startTime || session.endTime
                                        ? formatTimeRange(session.startTime, session.endTime)
                                        : session.dayOfWeek ?? "Time TBC"}
                                    </p>
                                    <p>{session.venue}</p>
                                  </button>
                                  <div className="mt-2 flex justify-end">
                                    <Button
                                      size="sm"
                                      variant={shortlistSet.has(session.id) ? "default" : "outline"}
                                      className="h-8 px-3 text-xs transition-colors sm:h-6 sm:px-2 sm:text-[11px]"
                                      onClick={() => toggleShortlist(session.id)}
                                      aria-label={shortlistSet.has(session.id) ? `Remove from shortlist: ${session.title}` : `Add to shortlist: ${session.title}`}
                                    >
                                      {shortlistSet.has(session.id) ? "Saved" : "Shortlist"}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                            {sessions.length === 0 && <p className="text-xs text-muted-foreground">No classes</p>}
                            {view === "month" && sessions.length > 3 && (
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
                  <Card>
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm">Undated classes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 p-3 pt-0">
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
                            className={`rounded-md border p-2 text-xs ${
                              featured
                                ? "border-amber-400 bg-amber-50 ring-1 ring-amber-300"
                                : DANCE_TYPE_CARD_CLASS[primaryType]
                            }`}
                          >
                            <button
                              onClick={() => setSelectedSession(session)}
                              className="w-full text-left hover:text-foreground/90"
                            >
                              {featured ? (
                                <span className="text-[10px] font-semibold text-amber-600">★ Featured</span>
                              ) : null}
                              <p className="font-medium">{session.title}</p>
                              <p className="text-muted-foreground">
                                {session.dayOfWeek ?? "Day TBC"} • {formatTimeRange(session.startTime, session.endTime)}
                              </p>
                              <p>{session.venue}</p>
                            </button>
                            <div className="mt-2 flex justify-end">
                              <Button
                                size="sm"
                                variant={shortlistSet.has(session.id) ? "default" : "outline"}
                                className="h-8 px-3 text-xs transition-colors sm:h-6 sm:px-2 sm:text-[11px]"
                                onClick={() => toggleShortlist(session.id)}
                                aria-label={
                                  shortlistSet.has(session.id)
                                    ? `Remove from shortlist: ${session.title}`
                                    : `Add to shortlist: ${session.title}`
                                }
                              >
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

            {mode === "calendar" && filteredSessions.length === 0 && (
              <div className="rounded-md border border-dashed border-input bg-card p-4 text-sm text-muted-foreground">
                No matching classes. Try clearing filters or broadening search.
              </div>
            )}

            {mode === "venues" && (
              <div className="space-y-3">
                <Card>
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-base">Spotted an error or missing class?</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Send feedback on the contact page and I&apos;ll try to fix issues when I can.
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <Button asChild size="sm">
                      <Link href={"/contact" as Route} prefetch={false}>
                        Open contact page
                      </Link>
                    </Button>
                    <SiteSocialLinks />
                  </CardContent>
                </Card>
                <div className="grid gap-3 md:grid-cols-2">
                  {sortedVenues.map((venue) => {
                    const relatedCount = relatedSessionCountByVenue.get(venue.name) ?? 0;
                    const isMuted = relatedCount === 0;
                    const status = getVenueStatus(venue);
                    const featured = isFeaturedVenueName(venue.name);
                    return (
                      <Card
                        key={venue.name}
                        className={`${isMuted ? "opacity-60" : ""} ${featured ? "border-amber-400 ring-1 ring-amber-300" : ""}`.trim()}
                      >
                        <CardHeader className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-base">{venue.name}</CardTitle>
                            <div className="flex items-center gap-2">
                              {featured ? (
                                <Badge className="border-amber-400 bg-amber-50 text-amber-700">★ Featured</Badge>
                              ) : null}
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {venue.count === 0 ? "No sessions found on last scrape" : `${venue.count} sessions last scrape`}
                            {venue.lastSuccessAt
                              ? ` • updated ${format(new Date(venue.lastSuccessAt), "d MMM yyyy, HH:mm")}`
                              : ""}
                          </p>
                          {!venue.ok && venue.lastError ? (
                            <p className="text-xs text-muted-foreground">{venue.lastError}</p>
                          ) : null}
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                          <Button variant="outline" asChild>
                            <TrackedOutboundLink
                              href={hrefForVenueSite(venue)}
                              analyticsKind="venue"
                              destHost={extractOutboundHostname(venue.sourceUrl)}
                            >
                              Venue site
                            </TrackedOutboundLink>
                          </Button>
                          <Button variant="outline" asChild>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                venue.mapQuery ?? getVenueMapQuery(venue.name)
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open map
                            </a>
                          </Button>
                        </CardContent>
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
                    <SelectTrigger>
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
                  <Button variant="outline" asChild>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapSearchQuery)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Google Maps
                    </a>
                  </Button>
                </div>
                <div className="space-y-2 overflow-hidden rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    Venue map is under construction. Locations may be incomplete or change without notice.
                  </p>
                  <iframe
                    title="Venue map"
                    src={`https://www.google.com/maps?q=${encodeURIComponent(mapSearchQuery)}&output=embed`}
                    className="h-[360px] w-full md:h-[520px]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            )}
            </section>

            {mode !== "venues" && (
              <section aria-label="Contact" className="mt-8 rounded-lg border border-input bg-card px-4 py-3 text-sm">
                <p className="mb-2 text-sm font-medium">Spotted an error or missing class?</p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Send feedback on the contact page and I&apos;ll try to fix issues when I can.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <Button asChild size="sm">
                    <Link href={"/contact" as Route} prefetch={false}>
                      Open contact page
                    </Link>
                  </Button>
                  <SiteSocialLinks />
                </div>
              </section>
            )}

          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedSession)} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
          {selectedSession && (
            isGagaSession(selectedSession) ? (
              <GagaSessionDialogContent
                session={selectedSession}
                shortlistSet={shortlistSet}
                toggleShortlist={toggleShortlist}
              />
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedSession.title}</DialogTitle>
                  <DialogDescription>
                    {selectedSession.venue} • {selectedSession.dayOfWeek ?? "Day TBC"} •{" "}
                    {formatTimeRange(selectedSession.startTime, selectedSession.endTime)}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <p>{selectedSession.details ?? "No additional description."}</p>
                  <div className="flex flex-wrap gap-2">
                    {inferDanceTypes(selectedSession).map((type) => (
                      <Badge key={`${selectedSession.id}-${type}`} className={DANCE_TYPE_BADGE_CLASS[type]}>
                        {type}
                      </Badge>
                    ))}
                  </div>
                  <p>
                    Date range: {selectedSession.startDate ?? "Open"} to {selectedSession.endDate ?? "Open"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={shortlistSet.has(selectedSession.id) ? "default" : "outline"}
                      onClick={() => toggleShortlist(selectedSession.id)}
                    >
                      {shortlistSet.has(selectedSession.id) ? "Remove from shortlist" : "Save to shortlist"}
                    </Button>
                    <Button asChild>
                      <TrackedOutboundLink
                        href={hrefForOutboundBooking(selectedSession)}
                        analyticsKind="booking"
                        destHost={extractOutboundHostname(selectedSession.bookingUrl)}
                      >
                        Booking
                      </TrackedOutboundLink>
                    </Button>
                    {canAddSessionToCalendar(selectedSession) ? (
                      <Button variant="outline" asChild>
                        <a href={`/api/classes/${encodeURIComponent(selectedSession.id)}/calendar`}>
                          Add to calendar
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" disabled>
                        Add to calendar unavailable
                      </Button>
                    )}
                    <Button variant="outline" asChild>
                      <TrackedOutboundLink
                        href={hrefForOutboundSource(selectedSession)}
                        analyticsKind="source"
                        destHost={extractOutboundHostname(selectedSession.sourceUrl)}
                      >
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
