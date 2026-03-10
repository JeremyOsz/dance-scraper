import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { CalendarPage } from "../../components/calendar/calendar-page";
import type { DanceSession } from "../../lib/types";

const sessions: DanceSession[] = [
  {
    id: "s1",
    venue: "TripSpace",
    title: "Embodied Workshop",
    details: "Open",
    dayOfWeek: "Monday",
    startTime: "6pm",
    endTime: "8pm",
    startDate: null,
    endDate: null,
    timezone: "Europe/London",
    bookingUrl: "https://tripspace.co.uk",
    sourceUrl: "https://tripspace.co.uk",
    tags: ["improvisation"],
    audience: "open",
    isWorkshop: true,
    lastSeenAt: "2026-03-10T00:00:00.000Z"
  },
  {
    id: "s2",
    venue: "Rambert",
    title: "Evening Technique",
    details: "Intermediate",
    dayOfWeek: "Tuesday",
    startTime: "7pm",
    endTime: "8pm",
    startDate: null,
    endDate: null,
    timezone: "Europe/London",
    bookingUrl: "https://rambert.org.uk",
    sourceUrl: "https://rambert.org.uk",
    tags: ["contemporary"],
    audience: "adult",
    isWorkshop: false,
    lastSeenAt: "2026-03-10T00:00:00.000Z"
  },
  {
    id: "s3",
    venue: "Butoh Mutation",
    title: "Butoh Mutation Classes & Workshops",
    details: "Schedule announced via venue site.",
    dayOfWeek: null,
    startTime: null,
    endTime: null,
    startDate: null,
    endDate: null,
    timezone: "Europe/London",
    bookingUrl: "https://www.butohuk.com/",
    sourceUrl: "https://www.butohuk.com/",
    tags: [],
    audience: "adult",
    isWorkshop: true,
    lastSeenAt: "2026-03-10T00:00:00.000Z"
  }
];

const venues = [
  {
    name: "TripSpace",
    sourceUrl: "https://tripspace.co.uk/dance/",
    count: 1,
    ok: true,
    lastSuccessAt: "2026-03-10T00:00:00.000Z"
  },
  {
    name: "Rambert",
    sourceUrl: "https://rambert.org.uk/classes/",
    count: 1,
    ok: true,
    lastSuccessAt: "2026-03-10T00:00:00.000Z"
  },
  {
    name: "Butoh Mutation",
    sourceUrl: "https://www.butohuk.com/",
    count: 1,
    ok: true,
    lastSuccessAt: "2026-03-10T00:00:00.000Z"
  }
];

describe("CalendarPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("disables preferred/shortlist-only toggles when nothing is saved", async () => {
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    expect(screen.queryByRole("checkbox", { name: "Preferred venues only" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Shortlist (0)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear shortlist (0)" })).toBeDisabled();
  });

  it("switches week/month and opens details", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Month" }));
    const titleNode = (await screen.findAllByText("Embodied Workshop"))[0];
    const classButton = titleNode.closest("button");
    expect(classButton).not.toBeNull();
    if (classButton) {
      await user.click(classButton);
    }
    expect(await screen.findByRole("heading", { name: "Embodied Workshop" })).toBeInTheDocument();
  });

  it("jumps to selected week from week picker", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Month" }));
    fireEvent.change(screen.getByLabelText("Go to week"), { target: { value: "2026-W12" } });

    await waitFor(() => {
      expect(screen.getByLabelText("Go to week")).toHaveValue("2026-W12");
      expect(screen.getByRole("button", { name: "Week" })).toHaveClass("bg-primary");
    });
    expect(screen.getByText("March 2026")).toBeInTheDocument();
  });

  it("shows venues and map views", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Venues" }));
    expect((await screen.findAllByRole("link", { name: "Venue site" })).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Map" }));
    const mapFrame = await screen.findByTitle("Venue map");
    expect(mapFrame).toBeInTheDocument();
    expect(mapFrame).toHaveAttribute(
      "src",
      expect.stringContaining(encodeURIComponent("London dance classes"))
    );
  });

  it("filters by selected venue chips", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "TripSpace" }));

    expect(screen.getAllByText("Embodied Workshop").length).toBeGreaterThan(0);
    expect(screen.queryByText("Evening Technique")).not.toBeInTheDocument();
  });

  it("grays out venue chips when no related events match active filters", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Tuesday" }));

    expect(screen.getByRole("button", { name: "TripSpace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Butoh Mutation" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rambert" })).not.toBeDisabled();
  });

  it("collapses week lanes to the selected day", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Tuesday" }));

    expect(screen.queryByRole("heading", { name: /Mon /i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Tue /i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Wed /i })).not.toBeInTheDocument();
  });

  it("supports multi-select day filters in the sidebar", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Monday" }));
    await user.click(screen.getByRole("button", { name: "Tuesday" }));

    expect(screen.getByRole("heading", { name: /Mon /i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Tue /i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Wed /i })).not.toBeInTheDocument();
  });

  it("shows undated sessions when a venue has no schedule metadata", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Butoh Mutation" }));

    expect(screen.getByText("Undated classes")).toBeInTheDocument();
    expect(screen.getByText("Butoh Mutation Classes & Workshops")).toBeInTheDocument();
    expect(screen.getByText(/Time TBC/i)).toBeInTheDocument();
  });

  it("saves shortlist and can filter to shortlist", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    const addButtons = screen.getAllByRole("button", { name: /add to shortlist/i });
    await user.click(addButtons[0]);

    expect(screen.getByRole("button", { name: "Clear shortlist (1)" })).not.toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Shortlist (1)" }));

    expect(screen.getAllByText("Embodied Workshop").length).toBeGreaterThan(0);
    expect(screen.queryByText("Evening Technique")).not.toBeInTheDocument();
  });

  it("clears active filters in one action", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.type(screen.getAllByPlaceholderText("Search class, teacher, style")[0], "technique");
    expect(screen.queryByText("Embodied Workshop")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).not.toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(screen.getAllByText("Embodied Workshop").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Evening Technique").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeDisabled();
  });

  it("loads stored filter/search state from localStorage", async () => {
    window.localStorage.setItem(
      "dance-scraper.calendar-filters",
      JSON.stringify({
        search: "technique",
        selectedVenue: "all",
        selectedDay: "all",
        selectedType: "all",
        workshopsOnly: false,
        shortlistOnly: false
      })
    );
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    expect((await screen.findAllByDisplayValue("technique")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Embodied Workshop")).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1 classes")).toBeInTheDocument();
  });
});
