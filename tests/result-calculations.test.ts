import { describe, expect, it } from "vitest";
import { competitionRanks, gradeFor, ordinal, remarkFor, scoreTotal } from "../lib/result-calculations";

describe("result calculations", () => {
  it("uses the selected 20/20/60 total", () => {
    expect(scoreTotal(17, 16, 39)).toBe(72);
    expect(scoreTotal(20, 20, 60)).toBe(100);
  });

  it.each([
    [100, "A"], [70, "A"], [69, "B"], [60, "B"], [59, "C"], [50, "C"],
    [49, "D"], [40, "D"], [39, "F"], [0, "F"],
  ])("grades %i as %s", (score, grade) => expect(gradeFor(score)).toBe(grade));

  it.each([
    [90, "Outstanding"], [89, "Excellent"], [80, "Excellent"], [79, "Very Good"],
    [70, "Very Good"], [69, "Good"], [60, "Good"], [59, "Average"],
    [50, "Average"], [49, "Pass"], [40, "Pass"], [39, "Fail"],
  ])("remarks %i as %s", (score, remark) => expect(remarkFor(score)).toBe(remark));

  it("uses competition ranking for ties", () => {
    const ranks = competitionRanks([
      { id: "ada", value: 90 }, { id: "bisi", value: 80 },
      { id: "chidi", value: 80 }, { id: "dapo", value: 70 },
    ]);
    expect([...ranks.entries()]).toEqual([["ada", 1], ["bisi", 2], ["chidi", 2], ["dapo", 4]]);
  });

  it("formats positions correctly", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st"]);
  });
});
