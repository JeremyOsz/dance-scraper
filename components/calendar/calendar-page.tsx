"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { format, addDays, addMonths, isSameMonth, subDays, subMonths } from "date-fns";
import type { DanceSession } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { canAddSessionToCalendar } from "@/lib/calendar-export";
import { DANCE_TYPES, matchesDanceType } from "@/lib/dance-types";
import { ORDERED_DAYS, formatTimeRange, getMonthGridDates, getWeekDates, isSessionActiveOnDate } from "@/lib/date";
import { getVenueMapQuery } from "@/lib/venues";

const PREFERRED_VENUES_STORAGE_KEY = "dance-scraper.preferred-venues";
const SHORTLIST_STORAGE_KEY = "dance-scraper.shortlist-session-ids";
const FILTERS_STORAGE_KEY = "dance-scraper.calendar-filters";

type StoredFilters = {
  search: string;
  selectedVenue: string;
  selectedDay: string;
  selectedType: string;
  workshopsOnly: boolean;
  preferredOnly: boolean;
  shortlistOnly: boolean;
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

function readStoredFilters(): StoredFilters | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return {
      search: typeof parsed.search === "string" ? parsed.search : "",
      selectedVenue: typeof parsed.selectedVenue === "string" ? parsed.selectedVenue : "all",
      selectedDay: typeof parsed.selectedDay === "string" ? parsed.selectedDay : "all",
      selectedType: typeof parsed.selectedType === "string" ? parsed.selectedType : "all",
      workshopsOnly: Boolean(parsed.workshopsOnly),
      preferredOnly: Boolean(parsed.preferredOnly),
      shortlistOnly: Boolean(parsed.shortlistOnly)
    };
  } catch {
    return null;
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

export function CalendarPage({ initialSessions, venues }: Props) {
  const [mode, setMode] = useState<"calendar" | "venues" | "map">("calendar");
  const [view, setView] = useState<"week" | "month">("week");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<DanceSession | null>(null);
  const [search, setSearch] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [workshopsOnly, setWorkshopsOnly] = useState(false);
  const [preferredVenues, setPreferredVenues] = useState<string[]>([]);
  const [preferredOnly, setPreferredOnly] = useState(false);
  const [shortlistSessionIds, setShortlistSessionIds] = useState<string[]>([]);
  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [showPreferredControls, setShowPreferredControls] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapVenue, setMapVenue] = useState<string>("all");

  const venueNames = useMemo(() => venues.map((venue) => venue.name), [venues]);

  useEffect(() => {
    const storedPreferredVenues = readStoredList(PREFERRED_VENUES_STORAGE_KEY);
    const storedShortlist = readStoredList(SHORTLIST_STORAGE_KEY);
    const storedFilters = readStoredFilters();
    setPreferredVenues(storedPreferredVenues);
    setShortlistSessionIds(storedShortlist);
    if (storedFilters) {
      setSearch(storedFilters.search);
      setSelectedVenue(storedFilters.selectedVenue);
      setSelectedDay(storedFilters.selectedDay);
      setSelectedType(storedFilters.selectedType);
      setWorkshopsOnly(storedFilters.workshopsOnly);
      setPreferredOnly(storedFilters.preferredOnly && storedPreferredVenues.length > 0);
      setShortlistOnly(storedFilters.shortlistOnly && storedShortlist.length > 0);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(PREFERRED_VENUES_STORAGE_KEY, JSON.stringify(preferredVenues));
  }, [preferredVenues]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify(shortlistSessionIds));
  }, [shortlistSessionIds]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedFilters: StoredFilters = {
      search,
      selectedVenue,
      selectedDay,
      selectedType,
      workshopsOnly,
      preferredOnly,
      shortlistOnly
    };
    window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(storedFilters));
  }, [search, selectedVenue, selectedDay, selectedType, workshopsOnly, preferredOnly, shortlistOnly]);

  useEffect(() => {
    if (preferredOnly && preferredVenues.length === 0) {
      setPreferredOnly(false);
    }
  }, [preferredOnly, preferredVenues.length]);

  useEffect(() => {
    if (shortlistOnly && shortlistSessionIds.length === 0) {
      setShortlistOnly(false);
    }
  }, [shortlistOnly, shortlistSessionIds.length]);

  const filteredSessions = useMemo(() => {
    return initialSessions.filter((session) => {
      if (selectedVenue !== "all" && session.venue !== selectedVenue) {
        return false;
      }
      if (selectedDay !== "all" && session.dayOfWeek !== selectedDay) {
        return false;
      }
      if (selectedType !== "all" && !matchesDanceType(session, selectedType)) {
        return false;
      }
      if (workshopsOnly && !session.isWorkshop) {
        return false;
      }
      if (preferredOnly && !preferredVenues.includes(session.venue)) {
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
    selectedVenue,
    selectedDay,
    selectedType,
    workshopsOnly,
    preferredOnly,
    preferredVenues,
    shortlistOnly,
    shortlistSessionIds
  ]);

  const dates = useMemo(
    () => (view === "week" ? getWeekDates(anchorDate) : getMonthGridDates(anchorDate)),
    [anchorDate, view]
  );
  const grouped = useMemo(() => groupByDate(filteredSessions, dates), [filteredSessions, dates]);
  const shortlistSet = useMemo(() => new Set(shortlistSessionIds), [shortlistSessionIds]);

  const togglePreferredVenue = (venue: string) => {
    setPreferredVenues((current) => toggleValue(current, venue));
  };

  const toggleShortlist = (sessionId: string) => {
    setShortlistSessionIds((current) => toggleValue(current, sessionId));
  };
  const clearFilters = () => {
    setSearch("");
    setSelectedVenue("all");
    setSelectedDay("all");
    setSelectedType("all");
    setWorkshopsOnly(false);
    setPreferredOnly(false);
    setShortlistOnly(false);
  };
  const clearShortlist = () => {
    setShortlistSessionIds([]);
  };
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count += 1;
    if (selectedVenue !== "all") count += 1;
    if (selectedDay !== "all") count += 1;
    if (selectedType !== "all") count += 1;
    if (workshopsOnly) count += 1;
    if (preferredOnly) count += 1;
    if (shortlistOnly) count += 1;
    return count;
  }, [search, selectedVenue, selectedDay, selectedType, workshopsOnly, preferredOnly, shortlistOnly]);

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

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      <Card className="border-none bg-transparent shadow-none">
        <CardHeader className="px-0">
          <CardTitle className="text-3xl tracking-tight">London Dance Calendar</CardTitle>
          <p className="text-sm text-muted-foreground">
            Browse adult and open dance and movement classes across London, then filter quickly by venue, day,
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
                    Narrow by class, venue, day, dance type, and saved lists.
                  </p>
                </div>
                <div className="space-y-3 p-3 transition-all duration-200 ease-out">
                  <Input
                    placeholder="Search class, teacher, style"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Venue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All venues</SelectItem>
                      {venueNames.map((venue) => (
                        <SelectItem key={venue} value={venue}>
                          {venue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedDay} onValueChange={setSelectedDay}>
                    <SelectTrigger>
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All days</SelectItem>
                      {ORDERED_DAYS.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {DANCE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <Checkbox
                      aria-label="Workshops only"
                      checked={workshopsOnly}
                      onChange={(e) => setWorkshopsOnly(e.target.checked)}
                    />
                    <span>Workshops only</span>
                  </label>
                  <div className="space-y-2 rounded-md border border-input bg-background p-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Button
                        variant={showPreferredControls ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowPreferredControls((current) => !current)}
                      >
                        {showPreferredControls ? "Hide preferred venues" : "Show preferred venues"}
                      </Button>
                      {showPreferredControls && (
                        <label className="flex items-center gap-2">
                          <Checkbox
                            aria-label="Preferred venues only"
                            checked={preferredOnly}
                            disabled={preferredVenues.length === 0}
                            onChange={(e) => setPreferredOnly(e.target.checked)}
                          />
                          <span>Preferred only</span>
                        </label>
                      )}
                    </div>
                    <div
                      className={
                        showPreferredControls
                          ? "grid gap-2 opacity-100 transition-opacity duration-200"
                          : "hidden"
                      }
                    >
                      {venueNames.map((venue) => (
                        <label key={venue} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            aria-label={venue}
                            checked={preferredVenues.includes(venue)}
                            onChange={() => togglePreferredVenue(venue)}
                          />
                          <span>{venue}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 rounded-md border border-input bg-background p-2">
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
                        Narrow by class, venue, day, dance type, and saved lists.
                      </DialogDescription>
                    </DialogHeader>
                    <Button variant="outline" size="sm" onClick={() => setFiltersOpen(false)}>
                      Close
                    </Button>
                  </div>
                  <div className="flex-1 space-y-3 overflow-y-auto p-4">
                    <Input
                      placeholder="Search class, teacher, style"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Venue" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All venues</SelectItem>
                        {venueNames.map((venue) => (
                          <SelectItem key={venue} value={venue}>
                            {venue}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedDay} onValueChange={setSelectedDay}>
                      <SelectTrigger>
                        <SelectValue placeholder="Day" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All days</SelectItem>
                        {ORDERED_DAYS.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {DANCE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <label className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <Checkbox
                        aria-label="Workshops only"
                        checked={workshopsOnly}
                        onChange={(e) => setWorkshopsOnly(e.target.checked)}
                      />
                      <span>Workshops only</span>
                    </label>
                    <div className="space-y-2 rounded-md border border-input bg-background p-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Button
                          variant={showPreferredControls ? "default" : "outline"}
                          size="sm"
                          onClick={() => setShowPreferredControls((current) => !current)}
                        >
                          {showPreferredControls ? "Hide preferred venues" : "Show preferred venues"}
                        </Button>
                        {showPreferredControls && (
                          <label className="flex items-center gap-2">
                            <Checkbox
                              aria-label="Preferred venues only"
                              checked={preferredOnly}
                              disabled={preferredVenues.length === 0}
                              onChange={(e) => setPreferredOnly(e.target.checked)}
                            />
                            <span>Preferred only</span>
                          </label>
                        )}
                      </div>
                      {showPreferredControls && (
                        <div className="grid gap-2">
                          {venueNames.map((venue) => (
                            <label key={venue} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                aria-label={venue}
                                checked={preferredVenues.includes(venue)}
                                onChange={() => togglePreferredVenue(venue)}
                              />
                              <span>{venue}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 rounded-md border border-input bg-background p-2">
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
              <span className="ml-auto">Showing {filteredSessions.length} classes</span>
            </div>

            {mode === "calendar" && (
              <>
                <div className="flex items-center gap-2">
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
                  <div className="ml-auto flex gap-2">
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
                        ? "grid min-w-[980px] grid-cols-7 gap-3"
                        : "grid grid-cols-1 gap-3 md:grid-cols-7"
                    }
                  >
                    {dates.map((date) => {
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
                            {sessions.slice(0, view === "month" ? 3 : 12).map((session) => (
                              <div
                                key={session.id + iso}
                                className="rounded-md border border-border bg-secondary/40 p-2 text-xs"
                              >
                                <button
                                  onClick={() => setSelectedSession(session)}
                                  className="w-full text-left hover:text-foreground/90"
                                >
                                  <p className="font-medium">{session.title}</p>
                                  <p className="text-muted-foreground">{formatTimeRange(session.startTime, session.endTime)}</p>
                                  <p>{session.venue}</p>
                                </button>
                                <div className="mt-2 flex justify-end">
                                  <Button
                                    size="sm"
                                    variant={shortlistSet.has(session.id) ? "default" : "outline"}
                                    className="h-6 px-2 text-[11px] transition-colors"
                                    onClick={() => toggleShortlist(session.id)}
                                    aria-label={shortlistSet.has(session.id) ? `Remove from shortlist: ${session.title}` : `Add to shortlist: ${session.title}`}
                                  >
                                    {shortlistSet.has(session.id) ? "Saved" : "Shortlist"}
                                  </Button>
                                </div>
                              </div>
                            ))}
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
              </>
            )}

            {mode === "calendar" && filteredSessions.length === 0 && (
              <div className="rounded-md border border-dashed border-input bg-card p-4 text-sm text-muted-foreground">
                No matching classes. Try clearing filters or broadening search.
              </div>
            )}

            {mode === "venues" && (
              <div className="grid gap-3 md:grid-cols-2">
                {venues.map((venue) => (
                  <Card key={venue.name}>
                    <CardHeader className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base">{venue.name}</CardTitle>
                        <Badge variant={venue.ok ? "secondary" : "outline"}>{venue.ok ? "OK" : "Warning"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {venue.count} sessions last scrape
                        {venue.lastSuccessAt ? ` • updated ${format(new Date(venue.lastSuccessAt), "d MMM yyyy, HH:mm")}` : ""}
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
                ))}
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
                    className="h-[520px] w-full"
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
        <DialogContent>
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
                <p>
                  Date range: {selectedSession.startDate ?? "Open"} to {selectedSession.endDate ?? "Open"}
                </p>
                <div className="flex gap-2">
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
