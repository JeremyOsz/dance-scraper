import { describe, expect, it } from "vitest";
import { inferSessionLevels, matchesSessionLevel } from "../../lib/levels";

describe("level inference", () => {
  it("infers common class levels", () => {
    expect(
      inferSessionLevels({
        title: "Absolute Beginners Salsa",
        details: null,
        tags: []
      })
    ).toEqual(["Beginner"]);

    expect(
      inferSessionLevels({
        title: "Contemporary Technique",
        details: "Intermediate class",
        tags: []
      })
    ).toEqual(["Intermediate"]);

    expect(
      inferSessionLevels({
        title: "Morning flow",
        details: "Open level class",
        tags: []
      })
    ).toEqual(["Open Level"]);
  });

  it("supports matching selected level", () => {
    expect(
      matchesSessionLevel(
        {
          title: "Improvers bachata",
          details: null,
          tags: []
        },
        "Intermediate"
      )
    ).toBe(true);
  });
});
