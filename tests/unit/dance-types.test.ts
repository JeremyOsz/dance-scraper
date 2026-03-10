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
      title: "Somatic Mobility",
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

    expect(inferDanceTypes(session)).toEqual(["Other"]);
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
