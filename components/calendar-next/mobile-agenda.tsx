import React from "react";
import { Bookmark, ChevronDown } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { parseTimeToMinutes, sortSessionsForVenueAgenda } from "@/lib/calendar-layout";
import { formatTimeRange, isSessionActiveOnDate } from "@/lib/date";
import type { DanceSessionOutbound } from "@/lib/types";
import { getEventTone } from "./event-style";
import type { CalendarEventSelection, CalendarView } from "./types";

type Props = {
  dates: Date[];
  today: Date;
  activeDate: Date;
  sessions: DanceSessionOutbound[];
  view: CalendarView;
  shortlistSet: Set<string>;
  onDateChange: (date: Date) => void;
  onSelect: (selection: CalendarEventSelection) => void;
  onToggleShortlist: (sessionId: string) => void;
  onNearEnd: () => void;
};

export function MobileAgenda({ dates, today, activeDate, sessions, view, shortlistSet, onDateChange, onSelect, onToggleShortlist, onNearEnd }: Props) {
  const [collapsedVenues, setCollapsedVenues] = React.useState<Set<string>>(() => new Set());
  const iso = format(activeDate, "yyyy-MM-dd");
  const daySessions = sessions.filter((session) => isSessionActiveOnDate(session, iso));
  const orderedSessions = sortSessionsForVenueAgenda(daySessions);
  const venueGroups = orderedSessions.reduce<Array<{ venue: string; sessions: DanceSessionOutbound[] }>>((groups, session) => {
    const current = groups.at(-1);
    const organizer = session.organizer?.trim() || session.venue;
    if (current?.venue === organizer) current.sessions.push(session);
    else groups.push({ venue: organizer, sessions: [session] });
    return groups;
  }, []);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    if (node.scrollWidth - node.scrollLeft - node.clientWidth < 160) onNearEnd();
  };

  const toggleVenue = (venue: string) => {
    setCollapsedVenues((current) => {
      const next = new Set(current);
      if (next.has(venue)) next.delete(venue);
      else next.add(venue);
      return next;
    });
  };

  return (
    <div data-testid="mobile-agenda" data-day-count={dates.length} className="md:hidden">
      {view === "week" ? (
        <div data-testid="mobile-date-row" className="sticky top-[72px] z-30 -mx-4 overflow-x-auto border-y border-[#cbc7bf] bg-[#fffefa]" onScroll={handleScroll}>
          <div className="flex min-w-max px-4">
            {dates.map((date) => {
              const selected = isSameDay(date, activeDate);
              const isToday = isSameDay(date, today);
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => onDateChange(date)}
                  className={`relative flex h-[62px] w-[54px] flex-col items-center justify-center border-r border-[#e2ded7] text-xs first:border-l ${selected ? "bg-[#073f5d] text-white" : "bg-[#fffefa] text-[#32302d]"}`}
                  aria-label={`Show ${format(date, "EEEE d MMMM")}${isToday ? ", today" : ""}`}
                >
                  {isToday ? <span className="absolute inset-x-0 top-0 h-0.5 bg-[#ee5b28]" aria-hidden /> : null}
                  <span className={`text-[8px] font-bold uppercase tracking-[0.14em] ${selected ? "text-white/75" : "text-[#79736d]"}`}>{format(date, "EEE")}</span>
                  <span className="font-display mt-0.5 text-base font-semibold">{format(date, "d")}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="py-5">
        <div className="mb-4 flex items-end justify-between gap-3 border-b border-[#bdb9b1] pb-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#78726c]">Browse by venue</p>
            <h2 className="font-display mt-1 text-xl font-semibold leading-tight text-[#073d5b]">{format(activeDate, "EEEE d MMMM")}</h2>
            <p className="mt-1 text-xs text-[#77716b]">{daySessions.length} {daySessions.length === 1 ? "class" : "classes"}</p>
          </div>
          {isSameDay(activeDate, today) ? <span className="border border-[#ec5b2a] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-[#d94414]">Today</span> : null}
        </div>

        <div className="border-t border-[#cbc7bf]">
          {venueGroups.map((group) => {
            const collapsed = collapsedVenues.has(group.venue);
            const venueId = `agenda-venue-${group.venue.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
            return (
              <section key={group.venue} className="border-b border-[#cbc7bf]" aria-labelledby={venueId}>
                <button
                  type="button"
                  className="flex min-h-12 w-full items-center gap-3 bg-[#f3f0e9] px-3 text-left text-[#073d5b] hover:bg-[#ece9e2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#075178]"
                  aria-expanded={!collapsed}
                  aria-controls={`${venueId}-classes`}
                  aria-label={`${collapsed ? "Expand" : "Collapse"} ${group.venue}`}
                  onClick={() => toggleVenue(group.venue)}
                >
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${collapsed ? "-rotate-90" : ""}`} aria-hidden />
                  <h3 id={venueId} className="font-display min-w-0 flex-1 text-[15px] font-semibold leading-snug">{group.venue}</h3>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#77716b]">{group.sessions.length} {group.sessions.length === 1 ? "option" : "options"}</span>
                </button>

                {!collapsed ? (
                  <div id={`${venueId}-classes`}>
                    {group.sessions.map((session) => {
                      const saved = shortlistSet.has(session.id);
                      const timeLabel = parseTimeToMinutes(session.startTime) === null
                        ? "Time TBC"
                        : formatTimeRange(session.startTime, session.endTime);
                      return (
                        <article key={session.id} className={`relative grid min-h-[82px] grid-cols-[78px_minmax(0,1fr)] border-t border-[#e4e0d9] border-l-[3px] bg-[#fffefa] pr-10 text-[#292622] first:border-t-0 ${getEventTone(session)}`}>
                          <div className="border-r border-[#ebe7e0] px-2.5 py-3 text-[10px] font-semibold leading-snug text-[#625d57]">{timeLabel}</div>
                          <button className="min-w-0 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#075178]" onClick={() => onSelect({ session, date: activeDate })} aria-label={`Open details: ${session.title}`}>
                            <h4 className="font-display text-[14px] font-semibold leading-[1.25] text-[#15394c]">{session.title}</h4>
                            {session.locationName && session.locationName !== group.venue ? <p className="mt-1 text-[10px] leading-snug text-[#77716b]">{session.locationName}</p> : null}
                            {session.isCourse || session.isWorkshop ? (
                              <span className="mt-2 flex flex-wrap gap-1.5">
                                {session.isCourse ? <span className="border border-[#d9d5cd] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#5f5b57]">Course</span> : null}
                                {session.isWorkshop ? <span className="border border-[#d9d5cd] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#5f5b57]">Workshop</span> : null}
                              </span>
                            ) : null}
                          </button>
                          <button
                            className="absolute right-1.5 top-1.5 p-2.5 text-[#74706a] hover:text-[#073d5b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075178]"
                            onClick={() => onToggleShortlist(session.id)}
                            aria-label={saved ? `Remove from shortlist: ${session.title}` : `Add to shortlist: ${session.title}`}
                          >
                            <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} aria-hidden />
                          </button>
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
          {daySessions.length === 0 ? (
            <div className="border-b border-[#cbc7bf] bg-[#fffefa] px-5 py-10 text-center">
              <p className="font-display font-semibold text-[#15394c]">No classes this day</p>
              <p className="mt-1 text-sm text-[#77716b]">Try another date or broaden your filters.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
