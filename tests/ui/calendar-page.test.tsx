import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { format, startOfDay } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarPage } from "../../components/calendar/calendar-page";
import type { DanceSession } from "../../lib/types";

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/",
  useSearchParams: () => mockSearchParams
}));

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
    venue: "Butoh Mutations",
    title: "Butoh Mutations Classes & Workshops",
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
  },
  {
    id: "s4",
    venue: "TripSpace",
    title: "Gaga People",
    details: "Open Gaga class",
    dayOfWeek: "Wednesday",
    startTime: "6pm",
    endTime: "7pm",
    startDate: null,
    endDate: null,
    timezone: "Europe/London",
    bookingUrl: "https://example.com/gaga",
    sourceUrl: "https://example.com/gaga",
    tags: ["gaga", "somatic"],
    audience: "adult",
    isWorkshop: false,
    lastSeenAt: "2026-03-10T00:00:00.000Z"
  }
];

const venues = [
  {
    name: "TripSpace",
    sourceUrl: "https://tripspace.co.uk/dance/",
    count: 1,
    ok: true,
    lastSuccessAt: "2026-03-10T00:00:00.000Z",
    lastError: null
  },
  {
    name: "Rambert",
    sourceUrl: "https://rambert.org.uk/classes/",
    count: 1,
    ok: true,
    lastSuccessAt: "2026-03-10T00:00:00.000Z",
    lastError: null
  },
  {
    name: "Butoh Mutations",
    sourceUrl: "https://www.butohuk.com/",
    count: 1,
    ok: true,
    lastSuccessAt: "2026-03-10T00:00:00.000Z",
    lastError: null
  },
  {
    name: "Danceworks",
    sourceUrl: "https://www.danceworks.com/london/classes/timetable/",
    count: 0,
    ok: true,
    lastSuccessAt: "2026-03-10T00:00:00.000Z",
    lastError: null
  },
  {
    name: "Warning Venue",
    sourceUrl: "https://warning.example.com",
    count: 0,
    ok: false,
    lastSuccessAt: null,
    lastError: "Request timed out while fetching schedule"
  }
];

describe("CalendarPage", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // Legacy API
        removeListener: vi.fn(), // Legacy API
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    });

    window.localStorage.clear();
    mockReplace.mockReset();
    mockSearchParams = new URLSearchParams();
    Object.defineProperty(window.navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn() }
    });
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

  it("uses colour-coded buttons for dance types in the type filter", () => {
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    const contemporaryTypeButton = screen.getAllByRole("button", { name: "Contemporary" })[0];
    const yogaPilatesTypeButton = screen.getAllByRole("button", { name: "Yoga/Pilates" })[0];
    const commercialHeelsTypeButton = screen.getAllByRole("button", { name: "Commercial/Heels" })[0];

    expect(contemporaryTypeButton).toHaveClass("bg-sky-100", "text-sky-800");
    expect(yogaPilatesTypeButton).toHaveClass("bg-cyan-100", "text-cyan-800");
    expect(commercialHeelsTypeButton).toHaveClass("bg-fuchsia-100", "text-fuchsia-800");
  });

  it("jumps to selected week from week picker", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Month" }));
    await user.click(screen.getByRole("button", { name: "Week" }));

    expect(screen.getByRole("button", { name: "Week" })).toHaveClass("bg-primary");
    expect(screen.getByText(format(startOfDay(new Date()), "MMMM yyyy"))).toBeInTheDocument();
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

  it("shows explicit no-events status for successful zero-count venues", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Venues" }));
    expect(screen.getAllByText("No events").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No sessions found on last scrape/i).length).toBeGreaterThan(0);
  });

  it("shows the scrape error for warning venues", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Venues" }));
    expect(screen.getByText("Error scraping")).toBeInTheDocument();
    expect(screen.getByText("Request timed out while fetching schedule")).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Butoh Mutations" })).toBeDisabled();
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

  it("filters by selected level chips", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Intermediate" }));

    expect(screen.getAllByText("Evening Technique").length).toBeGreaterThan(0);
    expect(screen.queryByText("Embodied Workshop")).not.toBeInTheDocument();
  });

  it("shows undated sessions when a venue has no schedule metadata", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Butoh Mutations" }));

    expect(screen.getByText("Undated classes")).toBeInTheDocument();
    expect(screen.getByText("Butoh Mutations Classes & Workshops")).toBeInTheDocument();
    expect(screen.getByText(/Time TBC/i)).toBeInTheDocument();
  });

  it("replaces Gaga listings with a boycott card and support links", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    expect(screen.getByText("Gaga People")).toBeInTheDocument();
    expect(screen.getByText(/Boycott.*Dancers for Palestine/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Why Boycott" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/p/DSXaLAIiIh2/"
    );
    expect(screen.queryByRole("link", { name: "UK Dancers for Palestine" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Instagram" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Gaga People/i }));
    expect(await screen.findByRole("heading", { name: /Gaga People/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "UK Dancers for Palestine" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/uk_dancers_for_palestine/"
    );
    expect(screen.getByRole("link", { name: "Why Boycott Batsheva" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/p/DSXaLAIiIh2/"
    );
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

  it("loads filter state from URL query params", async () => {
    mockSearchParams = new URLSearchParams("q=technique&venue=Rambert&mode=venues");
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    expect((await screen.findAllByDisplayValue("technique")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Embodied Workshop")).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1 classes")).toBeInTheDocument();
    expect((await screen.findAllByRole("link", { name: "Venue site" })).length).toBeGreaterThan(0);
  });

  it("updates URL params when filters or navigation change", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Tuesday" }));
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("day=Tuesday"), { scroll: false });
    });

    await user.click(screen.getByRole("button", { name: "Venues" }));
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("mode=venues"), { scroll: false });
    });
  });

  it("uses native share when available", async () => {
    const user = userEvent.setup();
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "share", { configurable: true, value: shareMock });
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("?mode=calendar&view=week&date="),
        title: "London Dance Calendar"
      })
    );
    expect(await screen.findByText("Shared")).toBeInTheDocument();
  });

  it("copies the current URL when native share is unavailable", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock }
    });
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining("?mode=calendar&view=week&date="));
    expect(await screen.findByText("Link copied")).toBeInTheDocument();
  });
});
