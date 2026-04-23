import { describe, expect, it } from "vitest";
import { isBigStudioVenueName, sortVenueNamesForUi, sortVenueRecordsForUi } from "@/lib/venue-order";

describe("venue-order", () => {
  it("detects big studio venue names", () => {
    expect(isBigStudioVenueName("Danceworks")).toBe(true);
    expect(isBigStudioVenueName("Pineapple Dance Studios")).toBe(true);
    expect(isBigStudioVenueName("Chisenhale Dance Space")).toBe(false);
  });

  it("sorts independent venues ahead of big studios", () => {
    const input = [
      "The Manor / MVMT",
      "Pineapple Dance Studios",
      "Marina Sfyridi",
      "Daniel Rodriguez",
      "Look At Movement (Tanztheatre)",
      "The Place",
      "Salsa! Soho",
      "TripSpace",
      "Danceworks",
      "Chisenhale Dance Space",
      "BASE Dance Studios"
    ];

    expect(sortVenueNamesForUi(input)).toEqual([
      "Daniel Rodriguez",
      "Look At Movement (Tanztheatre)",
      "Marina Sfyridi",
      "The Place",
      "Chisenhale Dance Space",
      "The Manor / MVMT",
      "TripSpace",
      "Salsa! Soho",
      "BASE Dance Studios",
      "Danceworks",
      "Pineapple Dance Studios"
    ]);
  });

  it("sorts venue records by lower count first while keeping big studios at the bottom", () => {
    const input = [
      { name: "Danceworks", count: 10 },
      { name: "The Place", count: 9 },
      { name: "Chisenhale Dance Space", count: 2 },
      { name: "Salsa! Soho", count: 1 },
      { name: "Pineapple Dance Studios", count: 1 },
      { name: "TripSpace", count: 4 }
    ];

    expect(sortVenueRecordsForUi(input).map((venue) => venue.name)).toEqual([
      "The Place",
      "Chisenhale Dance Space",
      "TripSpace",
      "Salsa! Soho",
      "Pineapple Dance Studios",
      "Danceworks"
    ]);
  });
});
