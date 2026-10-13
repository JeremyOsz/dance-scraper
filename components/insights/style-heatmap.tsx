"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ORDERED_DAYS } from "@/lib/date";
import type { TypeRow } from "@/lib/insights";

type HeatmapMode = "volume" | "pattern";

export function StyleHeatmap({ rows }: { rows: TypeRow[] }) {
  const [mode, setMode] = useState<HeatmapMode>("volume");
  const maximum = Math.max(...rows.map(row => row.peakAverage), 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Heatmap colour scale" className="flex flex-wrap gap-2">
          <Button size="sm" className="rounded-none border-[#c9c5bd]" variant={mode === "volume" ? "default" : "outline"} aria-pressed={mode === "volume"} onClick={() => setMode("volume")}>Class volume</Button>
          <Button size="sm" className="rounded-none border-[#c9c5bd]" variant={mode === "pattern" ? "default" : "outline"} aria-pressed={mode === "pattern"} onClick={() => setMode("pattern")}>Weekday pattern</Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-label="Colour legend">
          <span>{mode === "volume" ? "0" : "0%"}</span>
          <span aria-hidden="true" className="flex overflow-hidden">
            {[0, 0.25, 0.5, 0.75, 1].map(value => <span key={value} className="h-3 w-5" style={{ backgroundColor: `color-mix(in srgb, hsl(var(--primary)) ${value * 35}%, #fffefa)` }} />)}
          </span>
          <span>{mode === "volume" ? `${maximum.toFixed(1)} classes/day` : "100% of each style’s peak"}</span>
        </div>
      </div>
      <p id="heatmap-description" className="text-sm text-muted-foreground" aria-live="polite">
        {mode === "volume" ? "Compare class availability across styles. The same colour always represents the same daily average." : "Compare weekdays within each style. The darkest cell marks its busiest day; colours cannot compare volume across styles."}
        {" "}Numbers always show average classes per day.
      </p>
      <p className="text-xs text-muted-foreground sm:hidden">Scroll sideways to compare all seven days. Style names stay visible.</p>
      {rows.length === 0 ? <p className="py-6 text-sm text-muted-foreground">No scheduled classes in this date range.</p> : (
        <div className="max-h-[38rem] overflow-auto border border-[#c9c5bd]" tabIndex={0} role="region" aria-label="Style and weekday averages" aria-describedby="heatmap-description">
          <table className="w-full border-separate border-spacing-0 text-sm tabular-nums">
            <caption className="sr-only">Average listed classes per weekday over four dates. A class may have multiple styles.</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 top-0 z-30 min-w-36 border-b border-[#dcd7cf] bg-[#fffefa] px-3 py-3 text-left font-medium">Style</th>
                {ORDERED_DAYS.map(day => <th scope="col" key={day} className="sticky top-0 z-20 min-w-16 border-b border-[#dcd7cf] bg-[#fffefa] px-2 py-3 text-center font-medium"><span aria-hidden="true">{day.slice(0, 3)}</span><span className="sr-only">{day}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.type}>
                  <th scope="row" className="sticky left-0 z-10 border-b border-[#dcd7cf] bg-[#fffefa] px-3 py-2 text-left font-medium">{row.type}</th>
                  {ORDERED_DAYS.map(day => {
                    const value = row.byDay[day];
                    const scale = mode === "volume" ? maximum : row.peakAverage;
                    const intensity = scale > 0 ? value / scale : 0;
                    return <td key={day} className="border-b border-[#dcd7cf] px-1.5 py-2 text-center"><span className="block px-2 py-2 text-[#17384a]" style={{ backgroundColor: `color-mix(in srgb, hsl(var(--primary)) ${intensity * 35}%, #fffefa)` }}>{value.toFixed(1)}</span></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
