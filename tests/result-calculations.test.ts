import { describe, expect, it } from "vitest";
import { competitionRanks, gradeFor, ordinal, remarkFor, scoreTotal } from "../lib/result-calculations";

describe("result calculations", () => {
  it("uses the selected 20/20/60 total", () => {
    expect(scoreTotal(17, 16, 39)).toBe(72);
    expect(scoreTotal(20, 20, 60)).toBe(100);
  });

  it.each([
    [100, "A+"], [90, "A+"], [89, "A"], [80, "A"], [79, "B"], [70, "B"],
    [69, "C"], [60, "C"], [59, "D"], [50, "D"], [49, "E"], [40, "E"], [39, "F"], [0, "F"],
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
