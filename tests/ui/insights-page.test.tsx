import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import InsightsPage from "../../app/insights/page";

vi.mock("../../lib/data-store", () => ({
  readScrapeOutput: () => ({
    generatedAt: "2026-10-11T11:31:28.253Z",
    venues: [{ venue: "The Place", ok: false }],
    sessions: Array.from({ length: 11 }, (_, index) => ({
      id: String(index), venue: "Studio", title: index === 0 ? "Somatic" : "Ballet",
      styles: [index === 0 ? "Somatic" : "Ballet"],
      dayOfWeek: index === 0 ? "Sunday" : "Monday",
      startDate: null, endDate: null, tags: [], details: null
    }))
  })
}));

describe("insights visualization", () => {
  it("shows availability takeaways, refresh context, and a style ranking", () => {
    render(<InsightsPage />);
    expect(screen.getByText("Daily average")).toBeInTheDocument();
    expect(screen.getByText("Busiest weekday")).toBeInTheDocument();
    expect(screen.getByText("Quietest weekday")).toBeInTheDocument();
    expect(screen.getByText(/Data refreshed/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Most listed styles" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Top Styles By Day/ })).not.toBeInTheDocument();
    expect(screen.getByText(/A class can appear under more than one style/)).toBeInTheDocument();
  });

  it("switches heatmap normalization without changing daily average values", async () => {
    const user = userEvent.setup();
    render(<InsightsPage />);
    const row = screen.getByRole("row", { name: /^Somatic / });
    const cells = within(row).getAllByRole("cell");
    const values = cells.map(cell => cell.textContent);
    const initialColor = cells[6].querySelector("span")?.style.backgroundColor;
    await user.click(screen.getByRole("button", { name: "Weekday pattern" }));
    expect(screen.getByRole("button", { name: "Weekday pattern" })).toHaveAttribute("aria-pressed", "true");
    expect(cells.map(cell => cell.textContent)).toEqual(values);
    expect(cells[6].querySelector("span")?.style.backgroundColor).not.toBe(initialColor);
    expect(screen.getByText(/100% of each style/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Class volume" }));
    expect(cells[6].querySelector("span")?.style.backgroundColor).toBe(initialColor);
  });
});
