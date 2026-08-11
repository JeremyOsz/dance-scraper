import { describe, expect, it } from "vitest";
import { getLocationBySlug, getLocationProfiles } from "@/lib/locations";
import type { ScrapeOutput } from "@/lib/types";

const data: ScrapeOutput = {
  generatedAt: "2026-08-11T09:00:00.000Z",
  venues: [],
  sessions: [
    {
      id: "one",
      venue: "Organiser A",
      organizer: "Organiser A",
      locationName: "The Shared Hall",
      address: "1 Dance Street",
      postcode: "E8 1AA",
      borough: "Hackney",
      title: "Contemporary",
      details: null,
      dayOfWeek: "Tuesday",
      startTime: "19:00",
      endTime: "20:00",
      startDate: "2026-08-18",
      endDate: null,
      timezone: "Europe/London",
      bookingUrl: "https://example.com/one",
      sourceUrl: "https://example.com",
      tags: [],
      styles: ["Contemporary"],
      audience: "adult",
      isWorkshop: false,
      isCourse: false,
      lastSeenAt: "2026-08-11T09:00:00.000Z"
    },
    {
      id: "two",
      venue: "Organiser B",
      organizer: "Organiser B",
      locationName: "The Shared Hall",
      address: "1 Dance Street",
      postcode: "E8 1AA",
      borough: "Hackney",
      title: "Physical Theatre",
      details: null,
      dayOfWeek: "Wednesday",
      startTime: "19:00",
      endTime: "20:00",
      startDate: "2026-08-19",
      endDate: null,
      timezone: "Europe/London",
      bookingUrl: "https://example.com/two",
      sourceUrl: "https://example.com",
      tags: [],
      styles: ["Physical Theatre"],
      audience: "adult",
      isWorkshop: true,
      isCourse: false,
      lastSeenAt: "2026-08-11T09:00:00.000Z"
    },
    {
      id: "unknown",
      venue: "Organiser C",
      title: "Location TBC",
      details: null,
      dayOfWeek: null,
      startTime: null,
      endTime: null,
      startDate: null,
      endDate: null,
      timezone: "Europe/London",
      bookingUrl: "https://example.com/unknown",
      sourceUrl: "https://example.com",
      tags: [],
      audience: "adult",
      isWorkshop: false,
      isCourse: false,
      lastSeenAt: "2026-08-11T09:00:00.000Z"
    }
  ]
};

describe("location profiles", () => {
  it("groups sessions by physical location and omits unknown locations", () => {
    const locations = getLocationProfiles(data);

    expect(locations).toHaveLength(1);
    expect(locations[0]).toMatchObject({
      slug: "the-shared-hall",
      name: "The Shared Hall",
      address: "1 Dance Street",
      postcode: "E8 1AA",
      borough: "Hackney",
      organizers: ["Organiser A", "Organiser B"],
      classCount: 2
    });
    expect(locations[0].mapQuery).toBe("The Shared Hall, 1 Dance Street, E8 1AA");
  });

  it("looks up a location by stable slug", () => {
    expect(getLocationBySlug(data, "the-shared-hall")?.name).toBe("The Shared Hall");
    expect(getLocationBySlug(data, "location-tbc")).toBeNull();
  });
});
