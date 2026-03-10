import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
  }
];

describe("CalendarPage", () => {
  it("switches week/month and opens details", async () => {
    const user = userEvent.setup();
    render(
      <CalendarPage
        initialSessions={sessions}
        venues={[
          {
            name: "TripSpace",
            sourceUrl: "https://tripspace.co.uk/dance/",
            count: 1,
            ok: true,
            lastSuccessAt: "2026-03-10T00:00:00.000Z"
          }
        ]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Month" }));
    const titleNode = (await screen.findAllByText("Embodied Workshop"))[0];
    const classButton = titleNode.closest("button");
    expect(classButton).not.toBeNull();
    if (classButton) {
      await user.click(classButton);
    }
    expect(await screen.findByRole("heading", { name: "Embodied Workshop" })).toBeInTheDocument();
  });

  it("shows venues and map views", async () => {
    const user = userEvent.setup();
    render(
      <CalendarPage
        initialSessions={sessions}
        venues={[
          {
            name: "TripSpace",
            sourceUrl: "https://tripspace.co.uk/dance/",
            count: 1,
            ok: true,
            lastSuccessAt: "2026-03-10T00:00:00.000Z"
          }
        ]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Venues" }));
    expect(await screen.findByRole("link", { name: "Venue site" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Map" }));
    expect(await screen.findByTitle("Venue map")).toBeInTheDocument();
  });
});
