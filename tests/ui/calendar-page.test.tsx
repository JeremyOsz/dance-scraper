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
    organizer: "TripSpace",
    locationName: "TripSpace Arch",
    address: "339 Acton Mews",
    postcode: "E8 4EA",
    borough: "Hackney",
    styles: ["Improv"],
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
    isCourse: true,
    lastSeenAt: "2026-03-10T00:00:00.000Z"
  },
  {
    id: "s2",
    venue: "Rambert",
    organizer: "Rambert",
    locationName: "Rambert Studios",
    address: "99 Upper Ground",
    postcode: "SE1 9PP",
    borough: "Southwark",
    styles: ["Contemporary"],
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
    isCourse: false,
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
    isCourse: false,
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
    isCourse: false,
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

    expect(screen.getByRole("heading", { level: 1, name: "The Floor Is Yours..." })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Find dance classes" })).toBeInTheDocument();
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

  it("groups canonical styles into collapsible families", () => {
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    expect(screen.getByText("Technique & Stage")).toBeInTheDocument();
    expect(screen.getByText("Movement & Performance")).toBeInTheDocument();
    const contemporaryTypeButton = screen.getAllByRole("button", { name: "Contemporary" })[0];
    const yogaPilatesTypeButton = screen.getAllByRole("button", { name: "Yoga/Pilates" })[0];
    const commercialTypeButton = screen.getAllByRole("button", { name: "Commercial" })[0];

    expect(contemporaryTypeButton).toHaveClass("bg-sky-100", "text-sky-800");
    expect(yogaPilatesTypeButton).toHaveClass("bg-emerald-100", "text-emerald-800");
    expect(commercialTypeButton).toHaveClass("bg-violet-100", "text-violet-800");
  });

  it("separates organiser and physical-location filters in shareable URL state", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Rambert Studios" }));
    expect(screen.queryByText("Embodied Workshop")).not.toBeInTheDocument();
    expect(screen.getAllByText("Evening Technique").length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("location=Rambert+Studios"), { scroll: false });
    });
  });

  it("loads class listings from the API when sessions are not embedded", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ generatedAt: "2026-03-10T00:00:00.000Z", count: sessions.length, sessions })
    });
    Object.defineProperty(globalThis, "fetch", { configurable: true, value: fetchMock });

    try {
      render(<CalendarPage venues={venues} />);

      expect(screen.getByText("Loading latest classes")).toBeInTheDocument();
      expect(screen.getByText("Loading latest class listings")).toBeInTheDocument();
      expect(screen.queryByText("No classes")).not.toBeInTheDocument();
      expect(await screen.findByText("Embodied Workshop")).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith("/api/classes", { headers: { Accept: "application/json" } });
    } finally {
      Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });
    }
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

    await user.click(screen.getByRole("button", { name: "Venues list" }));
    expect((await screen.findAllByRole("link", { name: "Venue site" })).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Map view" }));
    const mapFrame = await screen.findByTitle("Location map");
    expect(mapFrame).toBeInTheDocument();
    expect(mapFrame).toHaveAttribute(
      "src",
      expect.stringContaining(encodeURIComponent("London dance classes"))
    );
  });

  it("groups repeated sessions in Courses mode and returns to Calendar", async () => {
    const user = userEvent.setup();
    const repeatedCourse: DanceSession = {
      ...sessions[0],
      id: "s1-second-date",
      dayOfWeek: "Thursday",
      startTime: "7pm",
      endTime: "9pm"
    };
    render(<CalendarPage initialSessions={[...sessions, repeatedCourse]} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Courses list" }));

    expect(screen.getByRole("heading", { level: 2, name: "Find dance courses" })).toBeInTheDocument();
    expect(screen.getByText("Showing 1 course")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Embodied Workshop" })).toHaveLength(1);
    expect(screen.getAllByText("Dates TBC").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /^Shortlist/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Calendar view" }));
    expect(screen.getByRole("heading", { level: 2, name: "Find dance classes" })).toBeInTheDocument();
  });

  it("loads Courses mode from the URL and labels courses in the calendar", async () => {
    mockSearchParams = new URLSearchParams("mode=courses");
    const { rerender } = render(<CalendarPage initialSessions={sessions} venues={venues} />);

    expect(await screen.findByRole("heading", { level: 2, name: "Find dance courses" })).toBeInTheDocument();

    mockSearchParams = new URLSearchParams("mode=calendar");
    rerender(<CalendarPage initialSessions={sessions} venues={venues} />);
    expect((await screen.findAllByText("Course")).length).toBeGreaterThan(0);
  });

  it("shows explicit no-events status for successful zero-count venues", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Venues list" }));
    expect(screen.getAllByText("No events").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/No sessions found on last scrape/i).length).toBeGreaterThan(0);
  });

  it("shows the scrape error for warning venues", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Venues list" }));
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

  it("dims venue chips when no related events match active filters", async () => {
    const user = userEvent.setup();
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Tuesday" }));

    expect(screen.getByRole("button", { name: "TripSpace" })).toHaveClass("opacity-70");
    expect(screen.getByRole("button", { name: "Butoh Mutations" })).toHaveClass("opacity-70");
    expect(screen.getByRole("button", { name: "Rambert" })).not.toHaveClass("opacity-70");
    expect(screen.getByRole("button", { name: "TripSpace" })).toBeEnabled();
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

    await user.click(screen.getByRole("button", { name: "Add to shortlist: Embodied Workshop" }));

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

    await user.click(screen.getByRole("button", { name: "Venues list" }));
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("mode=venues"), { scroll: false });
    });
  });

  it("opens share modal with link and QR code", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window.navigator, "share", { configurable: true, value: undefined });
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Share" }));

    expect(await screen.findByRole("dialog", { name: "Share this view" })).toBeInTheDocument();
    expect((screen.getByRole("textbox", { name: "Share link" }) as HTMLInputElement).value).toMatch(
      /mode=calendar&view=week&date=\d{4}-\d{2}-\d{2}/
    );
    expect(screen.getByTitle("QR code for this calendar view")).toBeInTheDocument();
  });

  it("copies share URL from the modal", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock }
    });
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Share" }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Copy link" }));

    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining("?mode=calendar&view=week&date="));
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });

  it("invokes native share from the modal when available", async () => {
    const user = userEvent.setup();
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "share", { configurable: true, value: shareMock });
    render(<CalendarPage initialSessions={sessions} venues={venues} />);

    await user.click(screen.getByRole("button", { name: "Share" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Share using device…" }));

    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("?mode=calendar&view=week&date="),
        title: "London Dance Calendar"
      })
    );
    expect(await screen.findByText("Shared")).toBeInTheDocument();
  });
});
