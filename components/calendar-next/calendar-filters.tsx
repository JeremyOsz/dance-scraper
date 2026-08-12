import React from "react";
import { Search, X } from "lucide-react";
import { DANCE_STYLE_GROUPS, type DanceStyle } from "@/lib/dance-types";
import { LEVELS, type Level } from "@/lib/levels";
import { ORDERED_DAYS } from "@/lib/date";
import type { TimeBucket } from "@/lib/calendar-layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { CalendarFilters } from "./types";

type Props = {
  filters: CalendarFilters;
  setFilters: React.Dispatch<React.SetStateAction<CalendarFilters>>;
  venueNames: string[];
  locationNames: string[];
  resultCount: number;
  shortlistCount: number;
  onClose?: () => void;
};

const TIME_OPTIONS: Array<{ value: TimeBucket; label: string }> = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" }
];

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <Separator className="mb-4 bg-[#dedbd5]" />
      <fieldset>
        <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#625d68]">{title}</legend>
        <div className="flex flex-col gap-2.5">{children}</div>
      </fieldset>
    </div>
  );
}

function FilterCheckbox({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <label className={`flex min-h-8 cursor-pointer items-center gap-2.5 text-sm ${disabled ? "cursor-not-allowed opacity-45" : ""}`}>
      <Checkbox
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="rounded-none border-[#94908a] data-[state=checked]:border-[#075178] data-[state=checked]:bg-[#075178]"
      />
      <span>{label}</span>
    </label>
  );
}

export function CalendarFiltersPanel({ filters, setFilters, venueNames, locationNames, resultCount, shortlistCount, onClose }: Props) {
  const clearAll = () => setFilters({
    search: "",
    venues: [],
    locations: [],
    days: [],
    styles: [],
    levels: [],
    times: [],
    workshopsOnly: false,
    coursesOnly: false,
    shortlistOnly: false
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f8f6f1] text-[#273a43]">
      <div className="flex items-start justify-between border-b border-[#dedbd5] px-5 py-5">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-[#073d5b]">Filters</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#6d6964]">Narrow the calendar without losing your place.</p>
        </div>
        {onClose ? (
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0" aria-label="Close filters" onClick={onClose}>
            <X className="h-5 w-5" aria-hidden />
          </Button>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 px-5 py-5">
          <label className="relative block">
            <span className="sr-only">Search classes</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777180]" aria-hidden />
            <Input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search classes, styles…"
              className="h-10 rounded-none border-[#cfcac2] bg-[#fffefa] pl-9 text-sm focus-visible:ring-[#075178]"
            />
          </label>

        <FilterGroup title="Time of day">
          {TIME_OPTIONS.map((option) => (
            <FilterCheckbox
              key={option.value}
              label={option.label}
              checked={filters.times.includes(option.value)}
              onChange={() => setFilters((current) => ({ ...current, times: toggleValue(current.times, option.value) }))}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Dance styles">
          {DANCE_STYLE_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-2 pt-1 first:pt-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#85808b]">{group.label}</p>
              {(group.styles as readonly DanceStyle[]).map((style) => (
                <FilterCheckbox
                  key={style}
                  label={style}
                  checked={filters.styles.includes(style)}
                  onChange={() => setFilters((current) => ({ ...current, styles: toggleValue<DanceStyle>(current.styles, style) }))}
                />
              ))}
            </div>
          ))}
        </FilterGroup>

        <FilterGroup title="Level">
          {LEVELS.map((level) => (
            <FilterCheckbox
              key={level}
              label={level}
              checked={filters.levels.includes(level)}
              onChange={() => setFilters((current) => ({ ...current, levels: toggleValue<Level>(current.levels, level) }))}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Weekday">
          <div className="grid grid-cols-2 gap-x-2">
            {ORDERED_DAYS.map((day) => (
              <FilterCheckbox
                key={day}
                label={day}
                checked={filters.days.includes(day)}
                onChange={() => setFilters((current) => ({ ...current, days: toggleValue(current.days, day) }))}
              />
            ))}
          </div>
        </FilterGroup>

        <FilterGroup title="Studios / organisers">
          {venueNames.map((venue) => (
            <FilterCheckbox
              key={venue}
              label={venue}
              checked={filters.venues.includes(venue)}
              onChange={() => setFilters((current) => ({ ...current, venues: toggleValue(current.venues, venue) }))}
            />
          ))}
        </FilterGroup>

        {locationNames.length > 0 ? (
          <FilterGroup title="Locations">
            {locationNames.map((location) => (
              <FilterCheckbox
                key={location}
                label={location}
                checked={filters.locations.includes(location)}
                onChange={() => setFilters((current) => ({ ...current, locations: toggleValue(current.locations, location) }))}
              />
            ))}
          </FilterGroup>
        ) : null}

        <FilterGroup title="More">
          <FilterCheckbox
            label="Workshops only"
            checked={filters.workshopsOnly}
            onChange={() => setFilters((current) => ({ ...current, workshopsOnly: !current.workshopsOnly }))}
          />
          <FilterCheckbox
            label="Courses only"
            checked={filters.coursesOnly}
            onChange={() => setFilters((current) => ({ ...current, coursesOnly: !current.coursesOnly }))}
          />
          <FilterCheckbox
            label={`Shortlist only (${shortlistCount})`}
            checked={filters.shortlistOnly}
            disabled={shortlistCount === 0}
            onChange={() => setFilters((current) => ({ ...current, shortlistOnly: !current.shortlistOnly }))}
          />
        </FilterGroup>
        </div>
      </ScrollArea>

      <div className="flex shrink-0 items-center gap-3 border-t border-[#dedbd5] bg-[#f8f6f1] p-4">
        {onClose ? (
          <>
            <Button variant="ghost" className="h-11 px-3 text-[#075178]" onClick={clearAll}>Clear all</Button>
            <Button className="h-11 flex-1 rounded-none bg-[#075178] text-white hover:bg-[#063e5c]" onClick={onClose}>
              Show {resultCount.toLocaleString("en-GB")} {resultCount === 1 ? "class" : "classes"}
            </Button>
          </>
        ) : (
          <>
            <p className="min-w-0 flex-1 text-xs font-medium text-[#6d6878]" aria-live="polite">
              {resultCount.toLocaleString("en-GB")} visible {resultCount === 1 ? "class" : "classes"}
            </p>
            <Button variant="ghost" className="h-10 shrink-0 px-3 text-[#075178]" onClick={clearAll}>Clear all</Button>
          </>
        )}
      </div>
    </div>
  );
}
