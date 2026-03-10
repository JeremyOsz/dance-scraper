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

  it("matches the requested dance type with 5Rythms spelling variant", () => {
    const session = {
      title: "Sunday 5Rythms Wave",
      details: null,
      tags: []
    };

    expect(matchesDanceType(session, "Ecstatic Dance/ 5Rythms")).toBe(true);
  });
});
