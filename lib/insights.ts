import { addDays, format, parseISO } from "date-fns";
import { DANCE_STYLES, type DanceStyle, inferDanceStyles } from "@/lib/dance-types";
import { isSessionActiveOnDate, ORDERED_DAYS } from "@/lib/date";
import type { DanceSession, DayOfWeek } from "@/lib/types";

type KnownDay = Exclude<DayOfWeek, null>;

export type DayAverage = { day: KnownDay; average: number };
export type TopTypeByDay = {
  day: KnownDay;
  topTypes: Array<{ type: DanceStyle; average: number }>;
};
export type TypeRow = {
  type: DanceStyle;
  averagePerDay: number;
  byDay: Record<KnownDay, number>;
  peakDay: KnownDay | null;
  peakAverage: number;
};
export type InsightsSnapshot = {
  windowStart: string;
  windowEnd: string;
  averagePerDay: number;
  dayAverages: DayAverage[];
  topTypesByDay: TopTypeByDay[];
  typeRows: TypeRow[];
};

function makeDayRecord(): Record<KnownDay, number> {
  return { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0 };
}

export function buildInsights(
  sessions: DanceSession[],
  anchorIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date())
): InsightsSnapshot {
  const anchor = parseISO(anchorIso);
  const dates = Array.from({ length: 28 }, (_, index) => format(addDays(anchor, index), "yyyy-MM-dd"));
  const dayCounts = makeDayRecord();
  const rows = DANCE_STYLES.map((type) => ({ type, counts: makeDayRecord() }));
  const sessionsWithStyles = sessions.map((session) => ({ session, styles: inferDanceStyles(session) }));

  for (const dateIso of dates) {
    const weekdayIndex = (parseISO(dateIso).getDay() + 6) % 7;
    const day = ORDERED_DAYS[weekdayIndex];
    for (const { session, styles } of sessionsWithStyles) {
      if (!isSessionActiveOnDate(session, dateIso)) continue;
      dayCounts[day] += 1;
      for (const row of rows) {
        if (styles.includes(row.type)) row.counts[day] += 1;
      }
    }
  }

  const dayAverages = ORDERED_DAYS.map((day) => ({ day, average: dayCounts[day] / 4 }));
  const typeRows: TypeRow[] = rows.map(({ type, counts }) => {
    const byDay = makeDayRecord();
    let peakDay: KnownDay | null = null;
    let peakAverage = 0;
    let total = 0;
    for (const day of ORDERED_DAYS) {
      total += counts[day];
      byDay[day] = counts[day] / 4;
      if (byDay[day] > peakAverage) {
        peakDay = day;
        peakAverage = byDay[day];
      }
    }
    return { type, averagePerDay: total / 28, byDay, peakDay, peakAverage };
  }).filter((row) => row.averagePerDay > 0)
    .sort((a, b) => b.averagePerDay - a.averagePerDay || a.type.localeCompare(b.type));

  const topTypesByDay = ORDERED_DAYS.map((day) => ({
    day,
    topTypes: typeRows.map((row) => ({ type: row.type, average: row.byDay[day] }))
      .filter((entry) => entry.average > 0)
      .sort((a, b) => b.average - a.average || a.type.localeCompare(b.type))
  }));

  return {
    windowStart: anchorIso,
    windowEnd: format(addDays(anchor, 27), "yyyy-MM-dd"),
    averagePerDay: ORDERED_DAYS.reduce((sum, day) => sum + dayCounts[day], 0) / 28,
    dayAverages,
    topTypesByDay,
    typeRows
  };
}
