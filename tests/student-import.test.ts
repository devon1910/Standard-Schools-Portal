import { describe, expect, it } from "vitest";
import { parseImportDate, studentImportRowSchema } from "../lib/student-import";

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
