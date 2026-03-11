import { describe, expect, it } from "vitest";
import { inferDanceTypes, matchesDanceType } from "../../lib/dance-types";

describe("dance type inference", () => {
  it("infers multiple dance types from title/details/tags", () => {
    const session = {
      title: "Ecstatic Dance Contact Improv Jam",
      details: "Open-level evening",
      tags: ["5rhythms"]
    };

    expect(inferDanceTypes(session)).toEqual(["Improv", "Contact Improv", "Ecstatic Dance/ 5Rythms"]);
  });

  it("falls back to Other when no known dance type is matched", () => {
    const session = {
      title: "Mobility Practice",
      details: "Gentle practice",
      tags: ["floorwork"]
    };

    expect(inferDanceTypes(session)).toEqual(["Other"]);
  });

  it("does not classify Improvers classes as Improv", () => {
    const session = {
      title: "Salsa Improvers",
      details: "Technique progression class",
      tags: []
    };

    expect(inferDanceTypes(session)).toEqual(["Salsa"]);
  });

  it("does not classify stale improv tags on Improvers classes as Improv", () => {
    const session = {
      title: "Ballet Improvers",
      details: "Technique progression class",
      tags: ["improv", "ballet"]
    };

    expect(inferDanceTypes(session)).toEqual(["Ballet"]);
  });

  it("infers Salsa, Bachata, Butoh and Somatic dance types", () => {
    expect(
      inferDanceTypes({
        title: "Salsa social night",
        details: null,
        tags: []
      })
    ).toEqual(["Salsa"]);

    expect(
      inferDanceTypes({
        title: "Bachata fundamentals",
        details: null,
        tags: []
      })
    ).toEqual(["Bachata"]);

    expect(
      inferDanceTypes({
        title: "Butoh lab",
        details: null,
        tags: []
      })
    ).toEqual(["Butoh"]);

    expect(
      inferDanceTypes({
        title: "Gaga and somatic flow",
        details: null,
        tags: []
      })
    ).toEqual(["Somatic"]);
  });

  it("infers additional dance and movement categories", () => {
    expect(
      inferDanceTypes({
        title: "Morning Yoga Flow",
        details: "Open level",
        tags: []
      })
    ).toEqual(["Yoga/Pilates"]);

    expect(
      inferDanceTypes({
        title: "Commercial Heels Choreo",
        details: null,
        tags: []
      })
    ).toEqual(["Commercial/Heels"]);

    expect(
      inferDanceTypes({
        title: "Ballroom & Tango Fundamentals",
        details: null,
        tags: []
      })
    ).toEqual(["Ballroom/Tango"]);

    expect(
      inferDanceTypes({
        title: "Vinyasa Flow 75",
        details: null,
        tags: []
      })
    ).toEqual(["Yoga/Pilates"]);

    expect(
      inferDanceTypes({
        title: "CI Peers Practice",
        details: "Open jam",
        tags: []
      })
    ).toEqual(["Contact Improv"]);

    expect(
      inferDanceTypes({
        title: "LindyHopEastLdn social",
        details: null,
        tags: []
      })
    ).toEqual(["Ballroom/Tango"]);
  });

  it("matches the requested dance type with 5Rythms spelling variant", () => {
    const session = {
      title: "Sunday 5Rythms Wave",
      details: null,
      tags: []
    };

    expect(matchesDanceType(session, "Ecstatic Dance/ 5Rythms")).toBe(true);
  });

  it("classifies Luminous events as Ecstatic Dance/ 5Rythms", () => {
    const session = {
      title: "Luminous New Moon Dance",
      details: "Conscious dance journey",
      tags: []
    };

    expect(matchesDanceType(session, "Ecstatic Dance/ 5Rythms")).toBe(true);
    expect(inferDanceTypes(session)).toContain("Ecstatic Dance/ 5Rythms");
  });

  it("uses venue context for sparse titles", () => {
    const bachataCommunitySession = {
      title: "Mojito Club - Classes",
      details: "Classes calendar",
      tags: [],
      venue: "Bachata Community"
    };
    expect(inferDanceTypes(bachataCommunitySession)).toContain("Bachata");

    const ciCalendarSession = {
      title: "Peers Practice Session",
      details: "Telegraph Hill",
      tags: [],
      venue: "CI Calendar London"
    };
    expect(inferDanceTypes(ciCalendarSession)).toContain("Contact Improv");

    const rambertSession = {
      title: "Professional Class",
      details: null,
      tags: [],
      venue: "Rambert"
    };
    expect(inferDanceTypes(rambertSession)).toContain("Contemporary");
  });
});
