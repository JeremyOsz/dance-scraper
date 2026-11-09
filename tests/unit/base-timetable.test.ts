import { describe, expect, it } from "vitest";
import { parseBaseTimetableText } from "../../scripts/scrape/adapters/base-dance-studios";

describe("BASE embedded timetable", () => {
  it("preserves row and column boundaries, including blank teacher cells", () => {
    const rows = parseBaseTimetableText("TIME\tTEACHER\tCLASS\tLEVEL\tSTUDIO\tPRICE\n16:00 - 17:25\tRandall Watson\tCommercial\tInt/Adv\tJackson\t£13\n18:00 - 19:00\t\tHeels\tBeginner\tJames Brown\t£13");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ time: "16:00 - 17:25", teacher: "Randall Watson", className: "Commercial" });
    expect(rows[1]).toMatchObject({ teacher: null, className: "Heels", studio: "James Brown" });
  });
  it("reads Sunday's timetable when its time column heading is blank", () => {
    expect(parseBaseTimetableText("\tTEACHER\tCLASS\tLEVEL\tSTUDIO\tPRICE\n11:30 - 12:55\tJaron Johnson\tBeginners Choreography\tBeginner\tJackson\t£15"))
      .toEqual([expect.objectContaining({ className: "Beginners Choreography", time: "11:30 - 12:55" })]);
  });
});
