import { CalendarPage } from "@/components/calendar/calendar-page";
import { readScrapeOutput } from "@/lib/data-store";
import { VENUES } from "@/lib/venues";

export default function Home() {
  const data = readScrapeOutput();
  const venueMap = new Map(
    data.venues.map((venue) => [
      venue.venue,
      {
        name: venue.venue,
        sourceUrl: venue.sourceUrl,
        mapQuery: VENUES[venue.key]?.mapQuery,
        count: venue.count,
        ok: venue.ok,
        lastSuccessAt: venue.lastSuccessAt
      }
    ])
  );
  const venues = Array.from(venueMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return <CalendarPage initialSessions={data.sessions} venues={venues} />;
}
