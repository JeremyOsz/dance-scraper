"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { format, addDays, addMonths, isSameMonth, parseISO, subDays, subMonths } from "date-fns";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DanceSession, DayOfWeek } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { canAddSessionToCalendar } from "@/lib/calendar-export";
import { DANCE_TYPES, inferDanceTypes, matchesDanceType, type DanceType } from "@/lib/dance-types";
import { ORDERED_DAYS, formatTimeRange, getMonthGridDates, getWeekDates, isSessionActiveOnDate } from "@/lib/date";
import { LEVELS, matchesSessionLevel, type Level } from "@/lib/levels";
import { getVenueMapQuery } from "@/lib/venues";

const SHORTLIST_STORAGE_KEY = "dance-scraper.shortlist-session-ids";
const VENUE_REQUEST_EMAIL = process.env.NEXT_PUBLIC_VENUE_REQUEST_EMAIL ?? "hello@dance-scraper.local";
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

type Props = {
  initialSessions: DanceSession[];
  venues: {
    name: string;
    sourceUrl: string;
    mapQuery?: string;
    count: number;
    ok: boolean;
    lastSuccessAt: string | null;
  }[];
};

function getVenueStatus(venue: Props["venues"][number]) {
  if (!venue.ok) {
    return { label: "Warning", variant: "outline" as const };
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
    return new Date();
  }
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function CalendarPage({ initialSessions, venues }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"calendar" | "venues" | "map">("calendar");
  const [view, setView] = useState<"week" | "month">("week");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<DanceSession | null>(null);
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

  const venueNames = useMemo(() => venues.map((venue) => venue.name), [venues]);

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
    params.set("date", format(anchorDate, "yyyy-MM-dd"));
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
    anchorDate,
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
    () => (view === "week" ? getWeekDates(anchorDate) : getMonthGridDates(anchorDate)),
    [anchorDate, view]
  );
  const weekPickerValue = useMemo(() => format(anchorDate, "RRRR-'W'II"), [anchorDate]);
  const visibleDates = useMemo(() => {
    if (view !== "week" || selectedDays.length === 0) {
      return dates;
    }
    return dates.filter((date) => selectedDays.includes(format(date, "EEEE")));
  }, [dates, selectedDays, view]);
  const grouped = useMemo(() => groupByDate(filteredSessions, visibleDates), [filteredSessions, visibleDates]);
  const undatedSessions = useMemo(
    () => filteredSessions.filter((session) => isUndatedSession(session)),
    [filteredSessions]
  );
  const shortlistSet = useMemo(() => new Set(shortlistSessionIds), [shortlistSessionIds]);

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
    const shareUrl = window.location.href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: "Dance Scraper London",
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
                variant={selectedTypes.includes(type) ? "default" : "outline"}
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
            {venueNames.map((venue) => {
              const relatedCount = relatedSessionCountByVenue.get(venue) ?? 0;
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
            Browse adult and open dance and movement classes across London, then filter quickly by type, venue, day,
            style, workshops, and your saved shortlist.
          </p>
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
                <div className="rounded-md border border-input bg-card px-3 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Colour legend</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DANCE_TYPES.map((type) => (
                      <Badge key={`legend-${type}`} className={DANCE_TYPE_BADGE_CLASS[type]}>
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

            {mode === "calendar" && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setAnchorDate((d) => (view === "week" ? subDays(d, 7) : subMonths(d, 1)))}
                  >
                    Previous
                  </Button>
                  <Button variant="outline" onClick={() => setAnchorDate(new Date())}>
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setAnchorDate((d) => (view === "week" ? addDays(d, 7) : addMonths(d, 1)))}
                  >
                    Next
                  </Button>
                  <Badge variant="secondary">{format(anchorDate, "MMMM yyyy")}</Badge>
                  <label htmlFor="week-picker" className="sr-only">
                    Go to week
                  </label>
                  <Input
                    id="week-picker"
                    type="week"
                    value={weekPickerValue}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!value) return;
                      const nextAnchor = parseISO(`${value}-1`);
                      if (Number.isNaN(nextAnchor.getTime())) return;
                      setAnchorDate(nextAnchor);
                      setView("week");
                    }}
                    className="w-full sm:w-[160px]"
                    aria-label="Go to week"
                  />
                  <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
                    <Button variant={view === "week" ? "default" : "outline"} onClick={() => setView("week")}>
                      Week
                    </Button>
                    <Button variant={view === "month" ? "default" : "outline"} onClick={() => setView("month")}>
                      Month
                    </Button>
                  </div>
                </div>

                <div className={view === "week" ? "overflow-x-auto pb-2" : ""}>
                  <div
                    className={
                      view === "week"
                        ? "grid grid-cols-1 gap-3 md:min-w-[1540px] md:grid-cols-7"
                        : "grid grid-cols-1 gap-3 md:grid-cols-7"
                    }
                  >
                    {visibleDates.map((date) => {
                      const iso = format(date, "yyyy-MM-dd");
                      const sessions = grouped.get(iso) ?? [];
                      const inMonth = isSameMonth(date, anchorDate);
                      return (
                        <Card key={iso} className={inMonth ? "" : "opacity-55"}>
                          <CardHeader className="p-3">
                            <CardTitle className="text-sm">
                              {format(date, "EEE d")}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 p-3 pt-0">
                            {sessions.slice(0, view === "month" ? 3 : 12).map((session) => {
                              const types = inferDanceTypes(session);
                              const primaryType = types[0] ?? "Other";
                              return (
                                <div
                                  key={session.id + iso}
                                  className={`rounded-md border p-2 text-xs ${DANCE_TYPE_CARD_CLASS[primaryType]}`}
                                >
                                  <button
                                    onClick={() => setSelectedSession(session)}
                                    className="w-full text-left hover:text-foreground/90"
                                  >
                                    <p className="font-medium">{session.title}</p>
                                    <p className="text-muted-foreground">
                                      {formatTimeRange(session.startTime, session.endTime)}
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
                  </div>
                </div>

                {undatedSessions.length > 0 && (
                  <Card>
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm">Undated classes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 p-3 pt-0">
                      {undatedSessions.map((session) => {
                        const types = inferDanceTypes(session);
                        const primaryType = types[0] ?? "Other";
                        return (
                          <div
                            key={session.id}
                            className={`rounded-md border p-2 text-xs ${DANCE_TYPE_CARD_CLASS[primaryType]}`}
                          >
                            <button
                              onClick={() => setSelectedSession(session)}
                              className="w-full text-left hover:text-foreground/90"
                            >
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
                    <CardTitle className="text-base">Request an additional venue</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Email us to suggest a new studio or organiser to include in this calendar.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" asChild>
                      <a href={`mailto:${VENUE_REQUEST_EMAIL}?subject=${encodeURIComponent("Venue request")}`}>
                        {VENUE_REQUEST_EMAIL}
                      </a>
                    </Button>
                  </CardContent>
                </Card>
                <div className="grid gap-3 md:grid-cols-2">
                  {venues.map((venue) => {
                    const relatedCount = relatedSessionCountByVenue.get(venue.name) ?? 0;
                    const isMuted = relatedCount === 0;
                    const status = getVenueStatus(venue);
                    return (
                      <Card key={venue.name} className={isMuted ? "opacity-60" : undefined}>
                        <CardHeader className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="text-base">{venue.name}</CardTitle>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {venue.count === 0 ? "No sessions found on last scrape" : `${venue.count} sessions last scrape`}
                            {venue.lastSuccessAt
                              ? ` • updated ${format(new Date(venue.lastSuccessAt), "d MMM yyyy, HH:mm")}`
                              : ""}
                          </p>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                          <Button variant="outline" asChild>
                            <a href={venue.sourceUrl} target="_blank" rel="noreferrer">
                              Venue site
                            </a>
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
                      {venueNames.map((venue) => (
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
                <div className="overflow-hidden rounded-md border">
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
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedSession)} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
          {selectedSession && (
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
                    <a href={selectedSession.bookingUrl} target="_blank" rel="noreferrer">
                      Booking
                    </a>
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
                    <a href={selectedSession.sourceUrl} target="_blank" rel="noreferrer">
                      Source
                    </a>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
