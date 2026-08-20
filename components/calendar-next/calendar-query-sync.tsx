"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { parseCalendarQuery, serializeCalendarQuery, type CalendarQueryState } from "./calendar-query-state";

type Props = {
  state: CalendarQueryState;
  venueNames: string[];
  locationNames: string[];
  onQueryState: (state: CalendarQueryState) => void;
};

export function CalendarQuerySync({ state, venueNames, locationNames, onQueryState }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onQueryState(parseCalendarQuery(new URLSearchParams(searchParams.toString()), { venueNames, locationNames }));
    setReady(true);
  }, [locationNames, onQueryState, searchParams, venueNames]);

  useEffect(() => {
    if (!ready) return;
    const query = serializeCalendarQuery(state);
    if (query !== searchParams.toString()) {
      window.history.replaceState(null, "", `${pathname}?${query}`);
    }
  }, [pathname, ready, searchParams, state]);

  return null;
}
