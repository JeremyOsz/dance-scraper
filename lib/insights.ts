import { DANCE_TYPES, type DanceType, inferDanceTypes } from "@/lib/dance-types";
import { ORDERED_DAYS } from "@/lib/date";
import type { DanceSession, DayOfWeek } from "@/lib/types";

type KnownDay = Exclude<DayOfWeek, null>;

export type DayTotal = {
  day: KnownDay;
  count: number;
  share: number;
};

export type TopTypeByDay = {
  day: KnownDay;
  topTypes: Array<{ type: DanceType; count: number }>;
};

export type TypeRow = {
  type: DanceType;
  total: number;
  byDay: Record<KnownDay, number>;
  peakDay: KnownDay | null;
  peakCount: number;
};

export type InsightsSnapshot = {
  totalSessions: number;
  sessionsWithKnownDay: number;
  sessionsWithoutKnownDay: number;
  dayTotals: DayTotal[];
  topTypesByDay: TopTypeByDay[];
  typeRows: TypeRow[];
};

function makeDayRecord(): Record<KnownDay, number> {
  return ORDERED_DAYS.reduce(
    (acc, day) => {
      acc[day] = 0;
      return acc;
    },
    {} as Record<KnownDay, number>
  );
}

function sortTypeCounts(entries: Array<{ type: DanceType; count: number }>) {
  return entries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.type.localeCompare(b.type);
  });
}

export function buildInsights(sessions: DanceSession[]): InsightsSnapshot {
  const dayCounts = makeDayRecord();
  const typeCountsByDay = new Map<KnownDay, Map<DanceType, number>>();
  const typeRows = new Map<DanceType, TypeRow>();

  for (const day of ORDERED_DAYS) {
    typeCountsByDay.set(day, new Map());
  }

  for (const type of DANCE_TYPES) {
    typeRows.set(type, {
      type,
      total: 0,
      byDay: makeDayRecord(),
      peakDay: null,
      peakCount: 0
    });
  }

  let sessionsWithKnownDay = 0;

  for (const session of sessions) {
    if (!session.dayOfWeek) continue;

    const day = session.dayOfWeek;
    sessionsWithKnownDay += 1;
    dayCounts[day] += 1;

    const detectedTypes = inferDanceTypes(session);
    const dayTypeCounts = typeCountsByDay.get(day);
    if (!dayTypeCounts) continue;

    for (const type of detectedTypes) {
      dayTypeCounts.set(type, (dayTypeCounts.get(type) ?? 0) + 1);
      const row = typeRows.get(type);
      if (!row) continue;
      row.total += 1;
      row.byDay[day] += 1;
    }
  }

  const dayTotals: DayTotal[] = ORDERED_DAYS.map((day) => ({
    day,
    count: dayCounts[day],
    share: sessionsWithKnownDay === 0 ? 0 : dayCounts[day] / sessionsWithKnownDay
  }));

  const topTypesByDay: TopTypeByDay[] = ORDERED_DAYS.map((day) => {
    const counts = typeCountsByDay.get(day) ?? new Map<DanceType, number>();
    const sorted = sortTypeCounts(Array.from(counts.entries()).map(([type, count]) => ({ type, count })));
    return { day, topTypes: sorted };
  });

  const populatedTypeRows = Array.from(typeRows.values())
    .map((row) => {
      let peakDay: KnownDay | null = null;
      let peakCount = 0;
      for (const day of ORDERED_DAYS) {
        const dayCount = row.byDay[day];
        if (dayCount > peakCount) {
          peakCount = dayCount;
          peakDay = day;
        }
      }
      return { ...row, peakDay, peakCount };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.type.localeCompare(b.type);
    });

  return {
    totalSessions: sessions.length,
    sessionsWithKnownDay,
    sessionsWithoutKnownDay: sessions.length - sessionsWithKnownDay,
    dayTotals,
    topTypesByDay,
    typeRows: populatedTypeRows
  };
}
