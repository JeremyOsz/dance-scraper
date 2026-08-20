import React from "react";
import { renderToString } from "react-dom/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDays, format } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarNextPage } from "../../components/calendar-next/calendar-next-page";
import type { DanceSession } from "../../lib/types";

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/calendar",
  useSearchParams: () => mockSearchParams
}));

const todayIso = format(new Date(), "yyyy-MM-dd");
const sessions: DanceSession[] = [
  {
    id: "morning",
    organizer: "The Place",
    venue: "The Place",
    locationName: "The Place, Studio 1",
    title: "Morning Contemporary",
    details: "Intermediate contemporary technique",
    dayOfWeek: null,
    startTime: "09:30",
    endTime: "11:00",
    startDate: todayIso,
    endDate: todayIso,
    timezone: "Europe/London",
    bookingUrl: "https://example.com/morning",
    sourceUrl: "https://example.com/source",
    tags: ["contemporary", "intermediate"],
    audience: "adult",
    isWorkshop: false,
    isCourse: false,
    lastSeenAt: new Date().toISOString()
  },
  {
    id: "evening",
    organizer: "Rambert",
    venue: "Rambert",
    locationName: "South Bank",
    title: "Evening Ballet",
    details: "Open level ballet",
    dayOfWeek: null,
    startTime: "7.30 pm",
    endTime: "9pm",
    startDate: todayIso,
    endDate: todayIso,
    timezone: "Europe/London",
    bookingUrl: "https://example.com/evening",
    sourceUrl: "https://example.com/source-evening",
    tags: ["ballet", "open"],
    audience: "adult",
    isWorkshop: true,
    isCourse: true,
    lastSeenAt: new Date().toISOString()
  }
];

describe("CalendarNextPage", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSearchParams = new URLSearchParams();
    window.localStorage.clear();
    Object.defineProperty(window.navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) }
    });
  });

  it("uses the serialized prerender date for server markup", () => {
    const html = renderToString(
      <CalendarNextPage
        initialDate="2000-01-01"
        initialSessions={[]}
        classCount={0}
        venueNames={[]}
      />
    );

    expect(html).toContain("1 Jan – 7 Jan 2000");
  });

  it("renders the new calendar shell and defaults to the rolling week", () => {
    render(<CalendarNextPage initialSessions={sessions} classCount={2} venueNames={["The Place", "Rambert"]} />);

    expect(screen.getByRole("heading", { level: 1, name: "London Dance Calendar" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Styles" })).toHaveAttribute("href", "/styles");
    expect(screen.getByRole("link", { name: "Locations" })).toHaveAttribute("href", "/locations");
    expect(screen.getByRole("radio", { name: "Week" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("desktop-card-agenda")).toHaveTextContent("Morning Contemporary");
    expect(screen.getByTestId("mobile-agenda")).toHaveTextContent("Morning Contemporary");
    expect(screen.queryByText("The Floor Is Yours...")).not.toBeInTheDocument();
  });

  it("filters by time of day and clears all filters", async () => {
    const user = userEvent.setup();
    render(<CalendarNextPage initialSessions={sessions} classCount={2} venueNames={["The Place", "Rambert"]} />);

    const sidebar = screen.getByRole("complementary", { name: "Filters" });
    await user.click(within(sidebar).getByRole("checkbox", { name: "Evening" }));

    expect(screen.getByTestId("desktop-card-agenda")).not.toHaveTextContent("Morning Contemporary");
    expect(screen.getByTestId("desktop-card-agenda")).toHaveTextContent("Evening Ballet");
    await user.click(within(sidebar).getByRole("button", { name: "Clear all" }));
    expect(screen.getByTestId("desktop-card-agenda")).toHaveTextContent("Morning Contemporary");
  });

  it("switches views and opens a month date in Day view", async () => {
    const user = userEvent.setup();
    const replaceState = vi.spyOn(window.history, "replaceState");
    render(<CalendarNextPage initialSessions={sessions} classCount={2} venueNames={["The Place", "Rambert"]} />);

    await user.click(screen.getByRole("radio", { name: "Month" }));
    const todayButton = screen.getByRole("button", { name: `Open ${format(new Date(), "EEEE d MMMM")}` });
    await user.click(todayButton);
    expect(screen.getByRole("radio", { name: "Day" })).toHaveAttribute("aria-checked", "true");
    await waitFor(() => expect(replaceState).toHaveBeenLastCalledWith(null, "", expect.stringContaining("view=day")));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("opens event details with reliable actions and preserves shortlist storage", async () => {
    const user = userEvent.setup();
    render(<CalendarNextPage initialSessions={sessions} classCount={2} venueNames={["The Place", "Rambert"]} />);

    await user.click(within(screen.getByTestId("desktop-card-agenda")).getByRole("button", { name: "Open details: Morning Contemporary" }));
    const dialog = await screen.findByRole("dialog", { name: "Morning Contemporary" });
    expect(within(dialog).getByText("The Place")).toBeVisible();
    expect(within(dialog).getByRole("link", { name: "Book now" })).toHaveAttribute("href", "https://example.com/morning");
    expect(within(dialog).getByRole("link", { name: "Add to calendar" })).toHaveAttribute(
      "href",
      "/api/classes/morning/calendar"
    );

    await user.click(within(dialog).getByRole("button", { name: "Save to shortlist" }));
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem("dance-scraper.shortlist-session-ids") ?? "[]")).toEqual(["morning"]);
    });
  });

  it("hydrates supported filters and view from the URL", async () => {
    mockSearchParams = new URLSearchParams("view=day&q=ballet&time=evening&style=Ballet&location=South+Bank&workshops=1&courses=1");
    render(<CalendarNextPage initialSessions={sessions} classCount={2} venueNames={["The Place", "Rambert"]} locationNames={["South Bank", "The Place, Studio 1"]} />);

    expect(await screen.findByRole("radio", { name: "Day" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("complementary", { name: "Filters" })).toHaveTextContent("1 visible class");
    expect(screen.getByRole("checkbox", { name: "South Bank" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Courses only" })).toBeChecked();
    expect(screen.getByTestId("desktop-card-agenda")).toHaveTextContent("Evening Ballet");
    expect(screen.getByTestId("desktop-card-agenda")).toHaveTextContent("Course");
    expect(screen.getByTestId("desktop-card-agenda")).not.toHaveTextContent("Morning Contemporary");
  });

  it("shows every dense class as a directly readable card", () => {
    const denseSessions = Array.from({ length: 6 }, (_, index): DanceSession => ({
      ...sessions[0],
      id: `dense-${index}`,
      title: `Dense class ${index + 1}`,
      startTime: "10:00",
      endTime: "11:30"
    }));
    render(<CalendarNextPage initialSessions={denseSessions} classCount={6} venueNames={["The Place"]} />);

    const agenda = screen.getByTestId("desktop-card-agenda");
    for (let index = 1; index <= 6; index += 1) {
      expect(within(agenda).getByRole("button", { name: `Open details: Dense class ${index}` })).toBeVisible();
    }
    expect(within(agenda).queryByRole("button", { name: /more classes/i })).not.toBeInTheDocument();
  });

  it("pins the date rows below the site header", () => {
    render(<CalendarNextPage initialSessions={sessions} classCount={2} venueNames={["The Place", "Rambert"]} />);

    expect(screen.getByTestId("desktop-date-row")).toHaveClass("sticky", "top-[72px]");
    expect(screen.getByTestId("mobile-date-row")).toHaveClass("sticky", "top-[72px]");
  });

  it("collapses and restores a venue without changing the rest of the day", async () => {
    const user = userEvent.setup();
    render(<CalendarNextPage initialSessions={sessions} classCount={2} venueNames={["The Place", "Rambert"]} />);

    const desktopAgenda = screen.getByTestId("desktop-card-agenda");
    const collapseVenue = within(desktopAgenda).getByRole("button", { name: "Collapse The Place for visible dates" });
    expect(collapseVenue).toHaveAttribute("aria-expanded", "true");

    await user.click(collapseVenue);
    expect(within(desktopAgenda).queryByRole("button", { name: "Open details: Morning Contemporary" })).not.toBeInTheDocument();
    expect(within(desktopAgenda).getByRole("button", { name: "Open details: Evening Ballet" })).toBeVisible();
    expect(within(desktopAgenda).getByRole("button", { name: "Expand The Place for visible dates" })).toHaveAttribute("aria-expanded", "false");

    await user.click(within(desktopAgenda).getByRole("button", { name: "Expand The Place for visible dates" }));
    expect(within(desktopAgenda).getByRole("button", { name: "Open details: Morning Contemporary" })).toBeVisible();
  });

  it("renders one venue band across multiple date columns", () => {
    const nextDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
    const nextDaySession: DanceSession = {
      ...sessions[0],
      id: "morning-next-day",
      title: "Tomorrow Contemporary",
      startDate: nextDate,
      endDate: nextDate
    };
    render(<CalendarNextPage initialSessions={[sessions[0], nextDaySession]} classCount={2} venueNames={["The Place"]} />);

    const desktopAgenda = screen.getByTestId("desktop-card-agenda");
    expect(within(desktopAgenda).getAllByRole("button", { name: "Collapse The Place for visible dates" })).toHaveLength(1);
    expect(within(desktopAgenda).getByRole("button", { name: "Open details: Morning Contemporary" })).toBeVisible();
    expect(within(desktopAgenda).getByRole("button", { name: "Open details: Tomorrow Contemporary" })).toBeVisible();
  });

  it("collapses venues in the mobile agenda", async () => {
    const user = userEvent.setup();
    render(<CalendarNextPage initialSessions={sessions} classCount={2} venueNames={["The Place", "Rambert"]} />);

    const mobileAgenda = screen.getByTestId("mobile-agenda");
    await user.click(within(mobileAgenda).getByRole("button", { name: "Collapse The Place" }));
    expect(within(mobileAgenda).queryByRole("button", { name: "Open details: Morning Contemporary" })).not.toBeInTheDocument();
    expect(within(mobileAgenda).getByRole("button", { name: "Expand The Place" })).toHaveAttribute("aria-expanded", "false");
  });

  it("orders the mobile daily agenda by venue priority, then time within each venue", () => {
    const agendaSessions: DanceSession[] = [
      { ...sessions[0], id: "studio-early", organizer: "Danceworks", venue: "Danceworks", title: "Studio early", startTime: "08:00" },
      { ...sessions[0], id: "place-late", organizer: "The Place", venue: "The Place", title: "Place late", startTime: "18:00" },
      { ...sessions[0], id: "place-early", organizer: "The Place", venue: "The Place", title: "Place early", startTime: "10:00" }
    ];
    render(<CalendarNextPage initialSessions={agendaSessions} classCount={3} venueNames={["The Place", "Danceworks"]} />);

    const agendaText = screen.getByTestId("mobile-agenda").textContent ?? "";
    expect(agendaText.indexOf("The Place")).toBeLessThan(agendaText.indexOf("Danceworks"));
    expect(agendaText.indexOf("Place early")).toBeLessThan(agendaText.indexOf("Place late"));
  });
});
