"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { addDays, addMonths, format, isValid, parseISO, startOfDay, subDays, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Filter, Search, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DANCE_STYLES, expandLegacyDanceTypes, matchesDanceStyle, type DanceStyle } from "@/lib/dance-types";
import { getForwardDayWindow, isSessionActiveOnDate, ORDERED_DAYS } from "@/lib/date";
import { LEVELS, matchesSessionLevel, type Level } from "@/lib/levels";
import { advanceLoadedDayCount, matchesTimeBuckets, type TimeBucket } from "@/lib/calendar-layout";
import type { DanceSessionOutbound, DayOfWeek } from "@/lib/types";
import { CalendarFiltersPanel } from "./calendar-filters";
import { DesktopAgenda } from "./desktop-agenda";
import { EventDetailSheet } from "./event-detail-sheet";
import { MobileAgenda } from "./mobile-agenda";
import { MonthGrid } from "./month-grid";
import { EMPTY_FILTERS, type CalendarEventSelection, type CalendarFilters, type CalendarView } from "./types";

const SHORTLIST_STORAGE_KEY = "dance-scraper.shortlist-session-ids";
const INITIAL_WEEK_DAYS = 7;
const MAX_WEEK_DAYS = 56;
const NO_LOCATIONS: string[] = [];

type Props = {
  classCount: number;
  venueNames: string[];
  locationNames?: string[];
  initialSessions?: DanceSessionOutbound[];
  listingsUpdatedText?: string;
};

function parseCsv(searchParams: URLSearchParams, key: string) {
  return (searchParams.get(key) ?? "").split(",").map((value) => value.trim()).filter(Boolean);
}

function parseAnchorDate(value: string | null) {
  if (!value) return startOfDay(new Date());
  const parsed = parseISO(value);
  return isValid(parsed) ? startOfDay(parsed) : startOfDay(new Date());
}

function countFilters(filters: CalendarFilters) {
  return Number(Boolean(filters.search.trim())) +
    Number(filters.venues.length > 0) +
    Number(filters.locations.length > 0) +
    Number(filters.days.length > 0) +
    Number(filters.styles.length > 0) +
    Number(filters.levels.length > 0) +
    Number(filters.times.length > 0) +
    Number(filters.workshopsOnly) +
    Number(filters.coursesOnly) +
    Number(filters.shortlistOnly);
}

export function CalendarNextPage({ classCount, venueNames, locationNames = NO_LOCATIONS, initialSessions, listingsUpdatedText }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<DanceSessionOutbound[]>(initialSessions ?? []);
  const [loading, setLoading] = useState(initialSessions === undefined);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<CalendarView>("week");
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date()));
  const [activeMobileDate, setActiveMobileDate] = useState(() => startOfDay(new Date()));
  const [loadedDayCount, setLoadedDayCount] = useState(INITIAL_WEEK_DAYS);
  const [filters, setFilters] = useState<CalendarFilters>(EMPTY_FILTERS);
  const [shortlistIds, setShortlistIds] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventSelection | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [urlReady, setUrlReady] = useState(false);

  const loadSessions = useCallback(async () => {
    if (initialSessions !== undefined) {
      setSessions(initialSessions);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/classes", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Classes API returned ${response.status}`);
      const payload = await response.json() as { sessions?: DanceSessionOutbound[] };
      if (!Array.isArray(payload.sessions)) throw new Error("Classes API response did not include sessions");
      setSessions(payload.sessions);
    } catch {
      setError("Unable to load class listings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [initialSessions]);

  useEffect(() => { void loadSessions(); }, [loadSessions]);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(SHORTLIST_STORAGE_KEY) ?? "[]");
      if (Array.isArray(stored)) setShortlistIds(stored.filter((item): item is string => typeof item === "string"));
    } catch {
      setShortlistIds([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify(shortlistIds));
  }, [shortlistIds]);

  useEffect(() => {
    const viewParam = searchParams.get("view");
    const nextView: CalendarView = viewParam === "day" || viewParam === "month" ? viewParam : "week";
    const nextDate = parseAnchorDate(searchParams.get("date"));
    const canonicalStyles = parseCsv(searchParams, "style").filter((value): value is DanceStyle => DANCE_STYLES.includes(value as DanceStyle));
    const nextStyles = canonicalStyles.length > 0 ? canonicalStyles : expandLegacyDanceTypes(parseCsv(searchParams, "type"));
    const nextLevels = parseCsv(searchParams, "level").filter((value): value is Level => LEVELS.includes(value as Level));
    const nextTimes = parseCsv(searchParams, "time").filter((value): value is TimeBucket => ["morning", "afternoon", "evening"].includes(value));
    const nextDays = parseCsv(searchParams, "day").filter((value): value is Exclude<DayOfWeek, null> => ORDERED_DAYS.includes(value as Exclude<DayOfWeek, null>));
    setView(nextView);
    setAnchorDate(nextDate);
    setActiveMobileDate(nextDate);
    setFilters({
      search: searchParams.get("q") ?? "",
      venues: parseCsv(searchParams, "venue").filter((venue) => venueNames.includes(venue)),
      locations: parseCsv(searchParams, "location").filter((location) => locationNames.includes(location)),
      days: nextDays,
      styles: nextStyles,
      levels: nextLevels,
      times: nextTimes,
      workshopsOnly: searchParams.get("workshops") === "1",
      coursesOnly: searchParams.get("courses") === "1",
      shortlistOnly: searchParams.get("shortlist") === "1"
    });
    setUrlReady(true);
  }, [locationNames, searchParams, venueNames]);

  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams();
    params.set("view", view);
    params.set("date", format(anchorDate, "yyyy-MM-dd"));
    if (filters.search.trim()) params.set("q", filters.search.trim());
    if (filters.venues.length) params.set("venue", filters.venues.join(","));
    if (filters.locations.length) params.set("location", filters.locations.join(","));
    if (filters.days.length) params.set("day", filters.days.join(","));
    if (filters.styles.length) params.set("style", filters.styles.join(","));
    if (filters.levels.length) params.set("level", filters.levels.join(","));
    if (filters.times.length) params.set("time", filters.times.join(","));
    if (filters.workshopsOnly) params.set("workshops", "1");
    if (filters.coursesOnly) params.set("courses", "1");
    if (filters.shortlistOnly) params.set("shortlist", "1");
    if (params.toString() !== searchParams.toString()) {
      router.replace(`${pathname}?${params.toString()}` as Route, { scroll: false });
    }
  }, [anchorDate, filters, pathname, router, searchParams, urlReady, view]);

  useEffect(() => {
    setLoadedDayCount(INITIAL_WEEK_DAYS);
    setActiveMobileDate(anchorDate);
  }, [anchorDate]);

  useEffect(() => {
    if (filters.shortlistOnly && shortlistIds.length === 0) {
      setFilters((current) => ({ ...current, shortlistOnly: false }));
    }
  }, [filters.shortlistOnly, shortlistIds.length]);

  const shortlistSet = useMemo(() => new Set(shortlistIds), [shortlistIds]);
  const filteredSessions = useMemo(() => sessions.filter((session) => {
    const organizer = session.organizer ?? session.venue;
    if (filters.venues.length && !filters.venues.includes(organizer)) return false;
    if (filters.locations.length && (!session.locationName || !filters.locations.includes(session.locationName))) return false;
    if (filters.days.length && (!session.dayOfWeek || !filters.days.includes(session.dayOfWeek))) return false;
    if (filters.styles.length && !filters.styles.some((style) => matchesDanceStyle(session, style))) return false;
    if (filters.levels.length && !filters.levels.some((level) => matchesSessionLevel(session, level))) return false;
    if (!matchesTimeBuckets(session.startTime, filters.times)) return false;
    if (filters.workshopsOnly && !session.isWorkshop) return false;
    if (filters.coursesOnly && !session.isCourse) return false;
    if (filters.shortlistOnly && !shortlistSet.has(session.id)) return false;
    if (filters.search.trim()) {
      const term = filters.search.trim().toLowerCase();
      const haystack = `${session.title} ${session.details ?? ""} ${organizer} ${session.locationName ?? ""} ${session.tags.join(" ")} ${session.styles?.join(" ") ?? ""}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  }), [filters, sessions, shortlistSet]);

  const visibleDates = useMemo(() => view === "day" ? [anchorDate] : getForwardDayWindow(anchorDate, loadedDayCount), [anchorDate, loadedDayCount, view]);
  const visibleOccurrenceCount = useMemo(() => visibleDates.reduce((count, date) => {
    const iso = format(date, "yyyy-MM-dd");
    return count + filteredSessions.filter((session) => isSessionActiveOnDate(session, iso)).length;
  }, 0), [filteredSessions, visibleDates]);

  const toggleShortlist = (sessionId: string) => setShortlistIds((current) => current.includes(sessionId) ? current.filter((id) => id !== sessionId) : [...current, sessionId]);
  const loadMoreDays = () => view === "week" && setLoadedDayCount((current) => advanceLoadedDayCount(current, 7, MAX_WEEK_DAYS));

  const selectView = (nextView: CalendarView) => {
    setView(nextView);
    if (nextView !== "week") setLoadedDayCount(INITIAL_WEEK_DAYS);
  };
  const openMonthDate = (date: Date) => {
    setAnchorDate(startOfDay(date));
    setActiveMobileDate(startOfDay(date));
    setView("day");
  };
  const navigate = (direction: -1 | 1) => {
    if (view === "month") setAnchorDate((current) => direction === 1 ? addMonths(current, 1) : subMonths(current, 1));
    else setAnchorDate((current) => direction === 1 ? addDays(current, view === "week" ? 7 : 1) : subDays(current, view === "week" ? 7 : 1));
  };
  const dateLabel = view === "month"
    ? format(anchorDate, "MMMM yyyy")
    : view === "day"
      ? format(anchorDate, "EEEE d MMMM yyyy")
      : `${format(anchorDate, "d MMM")} – ${format(addDays(anchorDate, 6), "d MMM yyyy")}`;

  const shareView = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: "London Dance Calendar", text: "London dance and movement classes", url });
    else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
  };

  return (
    <main className="calendar-next min-h-screen text-[#17384a]">
      <header className="sticky top-0 z-40 border-b border-[#c9c5bd] bg-[#fffefa]/95 backdrop-blur supports-[backdrop-filter]:bg-[#fffefa]/88">
        <div className="mx-auto flex h-[72px] max-w-[1800px] items-center justify-between gap-5 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-8">
            <Link href="/" className="font-display text-[12px] font-black uppercase leading-[0.88] tracking-[-0.03em] text-[#073d5b]" aria-label="London Dance Calendar">
              London<br />Dance<br />Calendar
            </Link>
            <nav aria-label="Primary" className="hidden items-center gap-6 text-[13px] font-medium text-[#4e5456] md:flex">
              <Link href="/" className="border-b-2 border-[#ee5b28] pb-1 text-[#073d5b]">Calendar</Link>
              <Link href={"/styles" as Route}>Styles</Link>
              <Link href={"/locations" as Route}>Locations</Link>
              <Link href="/studios">Studios</Link>
              <Link href="/insights">Insights</Link>
              <Link href="/contact">Contact</Link>
            </nav>
          </div>
          <h1 className="sr-only">London Dance Calendar</h1>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" className="h-11 w-11 p-0 lg:hidden" aria-label="Search and filters" onClick={() => setFiltersOpen(true)}><Search className="h-5 w-5" aria-hidden /></Button>
            <Button variant="outline" size="sm" className="h-9 border-[#cfcac2] bg-[#fffefa] font-medium text-[#073d5b]" onClick={() => void shareView()}><Share2 className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Share</span></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1800px] lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside aria-label="Filters" className="sticky top-[72px] hidden h-[calc(100svh-72px)] min-h-0 self-start overflow-hidden border-r border-[#c9c5bd] bg-[#f8f6f1]/94 lg:block">
          <CalendarFiltersPanel filters={filters} setFilters={setFilters} venueNames={venueNames} locationNames={locationNames} resultCount={visibleOccurrenceCount} shortlistCount={shortlistIds.length} />
        </aside>

        <section className="min-w-0 px-4 py-5 md:px-6 md:py-6">
          <div className="mb-5 flex flex-col gap-4 border-b border-[#c9c5bd] pb-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 w-9 rounded-none border-[#c9c5bd] bg-[#fffefa] p-0 text-[#073d5b]" aria-label="Previous period" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" aria-hidden /></Button>
                <Button variant="outline" size="sm" className="h-9 rounded-none border-[#ee5b28] bg-[#fffefa] px-4 font-semibold text-[#d94414] hover:bg-[#fff3ed] hover:text-[#bd360d]" onClick={() => setAnchorDate(startOfDay(new Date()))}>Today</Button>
                <Button variant="outline" size="sm" className="h-9 w-9 rounded-none border-[#c9c5bd] bg-[#fffefa] p-0 text-[#073d5b]" aria-label="Next period" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" aria-hidden /></Button>
              </div>
              <h2 className="font-display mt-4 text-xl font-semibold tracking-[-0.02em] text-[#073d5b] md:text-[26px]">{dateLabel}</h2>
              <p className="mt-1 text-xs text-[#746f69]" aria-live="polite">
                {loading ? `Loading ${classCount.toLocaleString("en-GB")} classes` : `${visibleOccurrenceCount} visible ${visibleOccurrenceCount === 1 ? "class" : "classes"}`}
                {listingsUpdatedText ? ` · ${listingsUpdatedText}` : ""}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" className="h-10 rounded-none border-[#c9c5bd] bg-[#fffefa] font-medium text-[#073d5b] lg:hidden" onClick={() => setFiltersOpen(true)}>
                <Filter className="h-4 w-4" aria-hidden />Filters{countFilters(filters) ? ` (${countFilters(filters)})` : ""}
              </Button>
              <ToggleGroup
                type="single"
                value={view}
                onValueChange={(value) => value && selectView(value as CalendarView)}
                aria-label="Calendar view"
                className="grid grid-cols-3 gap-0 border border-[#c9c5bd] bg-[#fffefa] p-0"
              >
                {(["day", "week", "month"] as CalendarView[]).map((item) => (
                  <ToggleGroupItem
                    key={item}
                    value={item}
                    aria-label={item[0].toUpperCase() + item.slice(1)}
                    className="h-9 rounded-none border-r border-[#dedad2] px-4 text-xs font-medium text-[#625f5a] last:border-r-0 data-[state=on]:bg-[#073f5d] data-[state=on]:text-white"
                  >
                    {item[0].toUpperCase() + item.slice(1)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-900"><p className="font-semibold">{error}</p><Button variant="outline" className="mt-4" onClick={() => void loadSessions()}>Try again</Button></div>
          ) : loading ? (
            <Skeleton className="h-[520px] rounded-xl border border-[#dcd8d0] bg-white" aria-label="Loading calendar" />
          ) : filteredSessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#cfcac0] bg-white px-6 py-16 text-center"><p className="font-bold">No matching classes</p><p className="mt-1 text-sm text-[#77717f]">Clear filters or try a broader search.</p></div>
          ) : view === "month" ? (
            <MonthGrid anchorDate={anchorDate} sessions={filteredSessions} onOpenDate={openMonthDate} />
          ) : (
            <>
              <DesktopAgenda dates={visibleDates} sessions={filteredSessions} view={view} shortlistSet={shortlistSet} onSelect={setSelectedEvent} onToggleShortlist={toggleShortlist} onNearEnd={loadMoreDays} />
              <MobileAgenda dates={visibleDates} activeDate={activeMobileDate} sessions={filteredSessions} view={view} shortlistSet={shortlistSet} onDateChange={setActiveMobileDate} onSelect={setSelectedEvent} onToggleShortlist={toggleShortlist} onNearEnd={loadMoreDays} />
            </>
          )}
        </section>
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="calendar-next-filter-sheet overflow-hidden border-[#d8d4cc] bg-[#f8f6f1] p-0 [&>button]:hidden lg:hidden">
          <SheetHeader className="sr-only"><SheetTitle>Filters</SheetTitle><SheetDescription>Filter dance classes</SheetDescription></SheetHeader>
          <CalendarFiltersPanel filters={filters} setFilters={setFilters} venueNames={venueNames} locationNames={locationNames} resultCount={visibleOccurrenceCount} shortlistCount={shortlistIds.length} onClose={() => setFiltersOpen(false)} />
        </SheetContent>
      </Sheet>

      <EventDetailSheet selection={selectedEvent} shortlisted={selectedEvent ? shortlistSet.has(selectedEvent.session.id) : false} onOpenChange={(open) => !open && setSelectedEvent(null)} onToggleShortlist={toggleShortlist} />
    </main>
  );
}
