import { describe, expect, it } from "vitest";
import { parseImportDate, studentImportRowSchema } from "../lib/student-import";
import { NIGERIAN_LOCATIONS, validateOrigin } from "../lib/nigeria-locations";

describe("student import validation", () => {
  it("accepts a real ISO calendar date", () => {
    expect(parseImportDate("2014-05-12")).toBeInstanceOf(Date);
  });

  it("rejects normalized and non-ISO dates", () => {
    expect(parseImportDate("2026-02-31")).toBeUndefined();
    expect(parseImportDate("31/01/2026")).toBeUndefined();
  });

  it("requires an admission number and a supported gender", () => {
    const base = { rowNumber: 2, name: "Ada Okafor", admissionNumber: "", gender: "Female" };
    expect(studentImportRowSchema.safeParse(base).success).toBe(false);
    expect(studentImportRowSchema.safeParse({ ...base, admissionNumber: "STD/1", gender: "Other" }).success).toBe(false);
    expect(studentImportRowSchema.safeParse({ ...base, admissionNumber: "STD/1" }).success).toBe(true);
  });
});

describe("student origin validation", () => {
  it("uses all states and their LGAs", () => {
    expect(Object.keys(NIGERIAN_LOCATIONS)).toHaveLength(37);
    expect(Object.values(NIGERIAN_LOCATIONS).flat()).toHaveLength(774);
  });

  it("normalizes case but rejects misspellings and mismatched LGAs", () => {
    expect(validateOrigin("lagos", "ikeja")).toEqual({ state: "Lagos", lga: "Ikeja" });
    expect(validateOrigin("Lags", "Ikeja").error).toMatch(/State of origin/);
    expect(validateOrigin("Lagos", "Aba North").error).toMatch(/does not belong/);
    expect(validateOrigin("", "Ikeja").error).toMatch(/Choose a state/);
  });
});
