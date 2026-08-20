import React from "react";
import { format, isSameDay, isSameMonth } from "date-fns";
import { getMonthGridDates, isSessionActiveOnDate } from "@/lib/date";
import type { DanceSessionOutbound } from "@/lib/types";

type Props = {
  anchorDate: Date;
  today: Date;
  sessions: DanceSessionOutbound[];
  onOpenDate: (date: Date) => void;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthGrid({ anchorDate, today, sessions, onOpenDate }: Props) {
  const dates = getMonthGridDates(anchorDate);
  return (
    <div className="overflow-hidden border border-[#c9c5bd] bg-[#fffefa]">
      <div className="grid grid-cols-7 border-b border-[#dedbd5] bg-[#fbfaf7]">
        {WEEKDAYS.map((day) => <div key={day} className="px-1 py-3 text-center text-[10px] font-semibold uppercase tracking-wide text-[#6e6878]">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {dates.map((date) => {
          const iso = format(date, "yyyy-MM-dd");
          const count = sessions.filter((session) => isSessionActiveOnDate(session, iso)).length;
          const isToday = isSameDay(date, today);
          return (
            <button
              key={iso}
              className={`min-h-24 border-b border-r border-[#e2ded7] p-2 text-left transition-colors hover:bg-[#eef5f7] max-sm:min-h-16 ${!isSameMonth(date, anchorDate) ? "bg-[#f7f5f0] text-[#aaa4af]" : ""}`}
              onClick={() => onOpenDate(date)}
              aria-label={`Open ${format(date, "EEEE d MMMM")}`}
            >
              <span className={`flex h-7 w-7 items-center justify-center text-sm font-semibold ${isToday ? "border border-[#ee5b28] text-[#d94414]" : ""}`}>{format(date, "d")}</span>
              {count > 0 ? (
                <span className="mt-3 block w-fit border border-[#d9d5cd] px-2 py-1 text-[10px] font-medium text-[#625d68] max-sm:mt-1 max-sm:h-1.5 max-sm:w-1.5 max-sm:border-0 max-sm:bg-[#075178] max-sm:p-0 max-sm:text-[0px]">
                  {count} {count === 1 ? "class" : "classes"}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
