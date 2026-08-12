import React from "react";
import { Bookmark, Building2, CalendarPlus, Clock, ExternalLink, MapPin, Share2, Star, X } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { canAddSessionToCalendar } from "@/lib/calendar-export";
import { formatTimeRange } from "@/lib/date";
import { inferDanceStyles } from "@/lib/dance-types";
import { isFeaturedSession } from "@/lib/featured";
import { LEVELS, matchesSessionLevel } from "@/lib/levels";
import type { CalendarEventSelection } from "./types";

type Props = {
  selection: CalendarEventSelection | null;
  shortlisted: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleShortlist: (sessionId: string) => void;
};

export function EventDetailSheet({ selection, shortlisted, onOpenChange, onToggleShortlist }: Props) {
  const session = selection?.session;
  if (!selection || !session) return null;
  const styles = inferDanceStyles(session);
  const organizer = session.organizer?.trim() || session.venue;
  const levels = LEVELS.filter((level) => matchesSessionLevel(session, level));
  const bookingHref = session.outboundBookingHref ?? session.bookingUrl;
  const sourceHref = session.outboundSourceHref ?? session.sourceUrl;

  const shareEvent = async () => {
    const url = window.location.href;
    const text = `${session.title} — ${format(selection.date, "EEE d MMM")} at ${session.locationName ?? organizer}`;
    if (navigator.share) {
      await navigator.share({ title: session.title, text, url });
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${text}\n${url}`);
    }
  };

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent side="right" className="calendar-next-detail-sheet overflow-hidden border-[#d8d4cc] bg-[#fbfaf7] p-0 [&>button]:hidden" aria-label={session.title}>
        <SheetHeader className="sr-only">
          <SheetTitle>{session.title}</SheetTitle>
          <SheetDescription>Class details and booking actions</SheetDescription>
        </SheetHeader>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[#dedbd5] px-5 py-4">
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0" aria-label="Close details" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" aria-hidden />
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0" aria-label={shortlisted ? "Remove from shortlist" : "Save to shortlist"} onClick={() => onToggleShortlist(session.id)}>
                <Bookmark className={`h-5 w-5 ${shortlisted ? "fill-current text-[#075178]" : ""}`} aria-hidden />
              </Button>
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0" aria-label="Share class" onClick={() => void shareEvent()}>
                <Share2 className="h-5 w-5" aria-hidden />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-7">
            <div className="flex flex-wrap gap-2">
              {styles.map((style) => <Badge key={style} className="border-0 bg-[#f1efe9] font-medium text-[#5f5968] hover:bg-[#f1efe9]">{style}</Badge>)}
              {session.isCourse ? <Badge variant="outline">Course</Badge> : null}
              {session.isWorkshop ? <Badge variant="outline">Workshop</Badge> : null}
              {isFeaturedSession(session) ? <Badge className="bg-amber-100 text-amber-800"><Star className="h-3 w-3 fill-current" aria-hidden />Featured</Badge> : null}
            </div>
            <h2 className="font-display mt-5 text-3xl font-semibold leading-tight tracking-tight text-[#073d5b]">{session.title}</h2>

            <dl className="mt-7 flex flex-col gap-4 border-b border-[#dedbd5] pb-7 text-sm">
              <div className="flex gap-3"><CalendarPlus className="mt-0.5 h-4 w-4 text-[#5f5968]" aria-hidden /><div><dt className="sr-only">Date</dt><dd>{format(selection.date, "EEEE d MMMM yyyy")}</dd></div></div>
              <div className="flex gap-3"><Clock className="mt-0.5 h-4 w-4 text-[#5f5968]" aria-hidden /><div><dt className="sr-only">Time</dt><dd>{formatTimeRange(session.startTime, session.endTime)}</dd></div></div>
              <div className="flex gap-3"><Building2 className="mt-0.5 h-4 w-4 text-[#5f5968]" aria-hidden /><div><dt className="sr-only">Organiser</dt><dd className="font-semibold">{organizer}</dd></div></div>
              {session.locationName ? (
                <div className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 text-[#5f5968]" aria-hidden /><div><dt className="sr-only">Location</dt><dd className="font-semibold">{session.locationName}{session.address || session.postcode ? <span className="mt-1 block text-xs font-normal text-[#77717f]">{[session.address, session.postcode].filter(Boolean).join(", ")}</span> : null}</dd></div></div>
              ) : null}
              {levels.length > 0 ? <div><dt className="text-xs uppercase tracking-wide text-[#77717f]">Level</dt><dd className="mt-1">{levels.join(", ")}</dd></div> : null}
            </dl>

            {session.details ? <p className="mt-7 whitespace-pre-line text-sm leading-7 text-[#403b47]">{session.details}</p> : null}

            <div className="mt-7 flex flex-col gap-2">
              {canAddSessionToCalendar(session) ? (
                <Button variant="outline" asChild className="h-12 w-full justify-between border-[#d5d1ca] bg-white">
                  <a href={`/api/classes/${encodeURIComponent(session.id)}/calendar`}><span className="flex items-center gap-2"><CalendarPlus className="h-4 w-4" aria-hidden />Add to calendar</span><ExternalLink className="h-4 w-4" aria-hidden /></a>
                </Button>
              ) : null}
              <Button variant="outline" asChild className="h-12 w-full justify-between border-[#d5d1ca] bg-white">
                <a href={sourceHref} target="_blank" rel="noreferrer"><span>View source</span><ExternalLink className="h-4 w-4" aria-hidden /></a>
              </Button>
            </div>
          </div>

          <div className="border-t border-[#dedbd5] bg-[#fbfaf7] p-4">
            <Button asChild className="h-14 w-full rounded-none bg-[#075178] text-base text-white hover:bg-[#063e5c]">
              <a href={bookingHref} target="_blank" rel="noreferrer">Book now</a>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
