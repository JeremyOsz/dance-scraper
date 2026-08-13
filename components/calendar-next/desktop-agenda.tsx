import React from "react";
import { Bookmark, ChevronDown, Star } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { parseTimeToMinutes, sortSessionsForVenueAgenda } from "@/lib/calendar-layout";
import { formatTimeRange, isSessionActiveOnDate } from "@/lib/date";
import { isFeaturedSession } from "@/lib/featured";
import type { DanceSessionOutbound } from "@/lib/types";
import { getEventTone } from "./event-style";
import type { CalendarEventSelection, CalendarView } from "./types";

type Props = {
  dates: Date[];
  sessions: DanceSessionOutbound[];
  view: CalendarView;
  shortlistSet: Set<string>;
  onSelect: (selection: CalendarEventSelection) => void;
  onToggleShortlist: (sessionId: string) => void;
  onNearEnd: () => void;
};

type VenueBand = {
  venue: string;
  sessionsByDate: Array<{ date: Date; sessions: DanceSessionOutbound[] }>;
  count: number;
};

function buildVenueBands(dates: Date[], sessions: DanceSessionOutbound[]): VenueBand[] {
  const occurrences = dates.flatMap((date) => {
    const iso = format(date, "yyyy-MM-dd");
    return sessions
      .filter((session) => isSessionActiveOnDate(session, iso))
      .map((session) => ({ date, session }));
  });
  const orderedSessions = sortSessionsForVenueAgenda(occurrences.map(({ session }) => session));
  const orderedVenues = [...new Set(orderedSessions.map((session) => session.organizer?.trim() || session.venue))];

  return orderedVenues.map((venue) => {
    const sessionsByDate = dates.map((date) => {
      const iso = format(date, "yyyy-MM-dd");
      return {
        date,
        sessions: sortSessionsForVenueAgenda(
          sessions.filter((session) =>
            (session.organizer?.trim() || session.venue) === venue && isSessionActiveOnDate(session, iso)
          )
        )
      };
    });
    return {
      venue,
      sessionsByDate,
      count: sessionsByDate.reduce((count, day) => count + day.sessions.length, 0)
    };
  });
}

function EventFlags({ session }: { session: DanceSessionOutbound }) {
  if (!session.isCourse && !session.isWorkshop) return null;
  return (
    <span className="mt-2 flex flex-wrap gap-1.5">
      {session.isCourse ? <span className="border border-[#d9d5cd] bg-[#fbfaf7] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#5f5b57]">Course</span> : null}
      {session.isWorkshop ? <span className="border border-[#d9d5cd] bg-[#fbfaf7] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#5f5b57]">Workshop</span> : null}
    </span>
  );
}

export function DesktopAgenda({ dates, sessions, view, shortlistSet, onSelect, onToggleShortlist, onNearEnd }: Props) {
  const [collapsedVenues, setCollapsedVenues] = React.useState<Set<string>>(() => new Set());
  const dateHeaderScrollRef = React.useRef<HTMLDivElement>(null);
  const agendaScrollRef = React.useRef<HTMLDivElement>(null);
  const venueBands = React.useMemo(() => buildVenueBands(dates, sessions), [dates, sessions]);
  const gridTemplateColumns = view === "day" ? "minmax(0, 1fr)" : `repeat(${dates.length}, minmax(184px, 1fr))`;
  const agendaWidth = view === "day" ? "100%" : `max(100%, ${dates.length * 184}px)`;

  const toggleVenue = (venue: string) => {
    setCollapsedVenues((current) => {
      const next = new Set(current);
      if (next.has(venue)) next.delete(venue);
      else next.add(venue);
      return next;
    });
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    if (dateHeaderScrollRef.current) dateHeaderScrollRef.current.scrollLeft = node.scrollLeft;
    if (node.scrollWidth - node.scrollLeft - node.clientWidth < 320) onNearEnd();
  };

  const handleDateHeaderScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (agendaScrollRef.current) agendaScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
  };

  return (
    <div data-testid="desktop-card-agenda" data-day-count={dates.length} className="hidden min-w-0 md:block">
      <div
        ref={dateHeaderScrollRef}
        data-testid="desktop-date-row"
        className="calendar-date-scrollbar sticky top-[72px] z-30 overflow-x-auto border border-[#cecac2] bg-[#fbfaf7]"
        onScroll={handleDateHeaderScroll}
      >
        <div className="grid min-w-full border-b border-[#bdb9b1]" style={{ width: agendaWidth, gridTemplateColumns }}>
          {dates.map((date) => {
            const iso = format(date, "yyyy-MM-dd");
            const dayCount = sessions.filter((session) => isSessionActiveOnDate(session, iso)).length;
            const today = isSameDay(date, new Date());
            return (
              <header key={iso} className={`min-w-0 border-r border-[#dedbd4] px-3 py-3 last:border-r-0 ${today ? "bg-[#eef5f7]" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#6f6a65]">{format(date, "EEEE")}</p>
                    <h3 id={`desktop-agenda-${iso}`} className="font-display mt-0.5 text-[15px] font-semibold leading-tight text-[#073d5b]">{format(date, "d MMMM")}</h3>
                  </div>
                  {today ? <span className="shrink-0 border border-[#ec5b2a] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-[#d94414]">Today</span> : null}
                </div>
                <p className="mt-1 text-[10px] text-[#7c7771]">{dayCount} {dayCount === 1 ? "class" : "classes"}</p>
              </header>
            );
          })}
        </div>
      </div>

      <div
        ref={agendaScrollRef}
        className="overflow-x-auto border-x border-b border-[#cecac2] bg-[#fffefa] outline-none focus-visible:ring-2 focus-visible:ring-[#075178] focus-visible:ring-offset-2"
        onScroll={handleScroll}
        tabIndex={0}
        role="region"
        aria-label={view === "day" ? "Classes for the selected day" : "Classes by day; scroll horizontally for more dates"}
      >
        <div className="min-w-full" style={{ width: agendaWidth }}>
          {venueBands.map((band) => {
            const collapsed = collapsedVenues.has(band.venue);
            const venueId = `desktop-venue-${band.venue.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
            return (
              <section key={band.venue} className="border-b border-[#cfcac2] last:border-b-0">
                <button
                  type="button"
                  className="group flex min-h-11 w-full items-center gap-3 border-b border-[#e2ded7] bg-[#f4f1ea] px-3 text-left text-[#073d5b] hover:bg-[#eeebe4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#075178]"
                  aria-expanded={!collapsed}
                  aria-controls={venueId}
                  aria-label={`${collapsed ? "Expand" : "Collapse"} ${band.venue} for visible dates`}
                  onClick={() => toggleVenue(band.venue)}
                >
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${collapsed ? "-rotate-90" : ""}`} aria-hidden />
                  <h4 className="font-display min-w-0 flex-1 text-sm font-semibold leading-snug">{band.venue}</h4>
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.08em] text-[#74706a]">{band.count} {band.count === 1 ? "class" : "classes"}</span>
                </button>

                {!collapsed ? (
                  <div id={venueId} className="grid items-stretch" style={{ gridTemplateColumns }}>
                    {band.sessionsByDate.map(({ date, sessions: daySessions }) => {
                      const iso = format(date, "yyyy-MM-dd");
                      return (
                        <div key={iso} className="min-w-0 border-r border-[#e1ddd6] bg-[#fffefa] last:border-r-0" aria-labelledby={`desktop-agenda-${iso}`}>
                          {daySessions.length ? daySessions.map((session) => {
                            const saved = shortlistSet.has(session.id);
                            const timeLabel = parseTimeToMinutes(session.startTime) === null
                              ? "Time TBC"
                              : formatTimeRange(session.startTime, session.endTime);
                            return (
                              <article key={session.id} className={`relative border-b border-[#e8e4dd] border-l-[3px] bg-[#fffefa] px-3 py-2.5 pr-9 text-[#272522] last:border-b-0 hover:bg-[#fbfaf6] ${getEventTone(session)}`}>
                                <button className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075178]" onClick={() => onSelect({ session, date })} aria-label={`Open details: ${session.title}`}>
                                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6a655f]">
                                    <span>{timeLabel}</span>
                                    {isFeaturedSession(session) ? <Star className="h-3 w-3 fill-current text-[#dd781d]" aria-label="Featured" /> : null}
                                  </div>
                                  <h5 className="font-display mt-1 text-[13px] font-semibold leading-[1.25] text-[#15394c]">{session.title}</h5>
                                  {session.locationName && session.locationName !== band.venue ? <p className="mt-1 text-[10px] leading-snug text-[#77716b]">{session.locationName}</p> : null}
                                  <EventFlags session={session} />
                                </button>
                                <button
                                  className="absolute right-1.5 top-1.5 p-2 text-[#74706a] hover:text-[#073d5b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075178]"
                                  onClick={() => onToggleShortlist(session.id)}
                                  aria-label={saved ? `Remove from shortlist: ${session.title}` : `Add to shortlist: ${session.title}`}
                                >
                                  <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} aria-hidden />
                                </button>
                              </article>
                            );
                          }) : <span className="block px-3 py-3 text-center text-xs text-[#b0aaa2]" aria-hidden>—</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
