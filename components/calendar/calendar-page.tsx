"use client";

import React from "react";
import { useMemo, useState } from "react";
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
import { ORDERED_DAYS, formatTimeRange, getMonthGridDates, getWeekDates, isSessionActiveOnDate } from "@/lib/date";

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

type Props = {
  initialSessions: DanceSession[];
  venues: {
    name: string;
    sourceUrl: string;
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
  const [workshopsOnly, setWorkshopsOnly] = useState(false);
  const [mapVenue, setMapVenue] = useState<string>("all");

  const venueNames = useMemo(() => venues.map((venue) => venue.name), [venues]);

  const filteredSessions = useMemo(() => {
    return initialSessions.filter((session) => {
      if (selectedVenue !== "all" && session.venue !== selectedVenue) {
        return false;
      }
      if (selectedDay !== "all" && session.dayOfWeek !== selectedDay) {
        return false;
      }
      if (workshopsOnly && !session.isWorkshop) {
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
  }, [initialSessions, search, selectedVenue, selectedDay, workshopsOnly]);

  const dates = useMemo(
    () => (view === "week" ? getWeekDates(anchorDate) : getMonthGridDates(anchorDate)),
    [anchorDate, view]
  );
  const grouped = useMemo(() => groupByDate(filteredSessions, dates), [filteredSessions, dates]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      <Card className="border-none bg-transparent shadow-none">
        <CardHeader className="px-0">
          <CardTitle className="text-3xl tracking-tight">London Dance Calendar</CardTitle>
          <p className="text-sm text-muted-foreground">
            Adult and open dance/movement classes across The Place, Rambert, Siobhan Davies, TripSpace,
            Chisenhale Dance Space, CI Calendar London, Bachata Community, Ecstatic Dance London, and Five Rhythms London.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 px-0">
          <div className="grid gap-3 md:grid-cols-5">
            <Input placeholder="Search class, teacher, style" value={search} onChange={(e) => setSearch(e.target.value)} />
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
            <div className="flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm">
              <Checkbox checked={workshopsOnly} onChange={(e) => setWorkshopsOnly(e.target.checked)} />
              <span>Workshops only</span>
            </div>
            <div className="flex gap-2">
              <Button variant={mode === "calendar" ? "default" : "outline"} onClick={() => setMode("calendar")}>
                Calendar
              </Button>
              <Button variant={mode === "venues" ? "default" : "outline"} onClick={() => setMode("venues")}>
                Venues
              </Button>
              <Button variant={mode === "map" ? "default" : "outline"} onClick={() => setMode("map")}>
                Map
              </Button>
            </div>
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

              <div className={view === "week" ? "grid gap-3 md:grid-cols-7" : "grid grid-cols-1 gap-3 md:grid-cols-7"}>
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
                          <button
                            key={session.id + iso}
                            onClick={() => setSelectedSession(session)}
                            className="w-full rounded-md border border-border bg-secondary/40 p-2 text-left text-xs hover:bg-accent/80"
                          >
                            <p className="font-medium">{session.title}</p>
                            <p className="text-muted-foreground">{formatTimeRange(session.startTime, session.endTime)}</p>
                            <p>{session.venue}</p>
                          </button>
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
            </>
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
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} London`)}`}
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
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      mapVenue === "all" ? "London dance classes" : `${mapVenue} London`
                    )}`}
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
                  src={`https://www.google.com/maps?q=${encodeURIComponent(
                    mapVenue === "all" ? "London dance classes" : `${mapVenue} London`
                  )}&output=embed`}
                  className="h-[520px] w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          )}
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
