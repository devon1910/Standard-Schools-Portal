import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { allocateStudentIds } from "../lib/allocate-student-ids";
import { admissionClassCode, displayStudentId, formatStudentId, parseAdmissionStudentId, studentAdmission, studentIdConfigSchema } from "../lib/student-id";

describe("student IDs", () => {
  it("formats the requested examples and grows past the number width", () => {
    expect(formatStudentId("SS", 3, 1)).toBe("SS001");
    expect(formatStudentId("HG", 3, 2)).toBe("HG002");
    expect(formatStudentId("ADM", 4, 2)).toBe("ADM0002");
    expect(formatStudentId("SS", 3, 1000)).toBe("SS1000");
  });

  it("requires a valid prefix and explicit confirmation", () => {
    const data = { prefix: " ss ", digits: "3", start: "1", confirmed: "on" };
    expect(studentIdConfigSchema.parse(data).prefix).toBe("SS");
    for (const change of [{ prefix: "SS01" }, { digits: "0" }, { start: "0" }, { confirmed: "" }]) {
      expect(studentIdConfigSchema.safeParse({ ...data, ...change }).success).toBe(false);
    }
  });

  it("keeps legacy identifiers as display fallbacks", () => {
    expect(displayStudentId({ id: BigInt(8), studentId: null, admissionNumber: "OLD/2" })).toBe("OLD/2");
    expect(displayStudentId({ id: BigInt(8), studentId: null, admissionNumber: null })).toBe("8");
    expect(displayStudentId({ id: BigInt(8), studentId: "SS001", admissionNumber: "OLD/2" })).toBe("SS001");
  });

  function transaction(prefix: string | null = "SS") {
    return {
      $queryRaw: vi.fn().mockResolvedValue([{ studentIdPrefix: prefix, studentIdDigits: 3, nextStudentNumber: 1 }]),
      studentProfile: { findMany: vi.fn().mockResolvedValue([{ studentId: null, admissionNumber: "ss001" }, { studentId: "SS003", admissionNumber: null }]) },
      legacyStudent: { findMany: vi.fn().mockResolvedValue([{ admissionNumber: "ss006" }]) },
      school: { update: vi.fn().mockResolvedValue({}) },
    };
  }

  it("allocates a batch under a school row lock and skips existing identifiers", async () => {
    const tx = transaction();
    expect(await allocateStudentIds(tx as unknown as Prisma.TransactionClient, 5, Array.from({ length: 3 }, () => ({ className: "Basic 4A" })))).toEqual(["SS002", "SS004", "SS005"]);
    expect(tx.$queryRaw.mock.calls[0][0].join("")).toMatch(/FOR UPDATE/);
    expect(tx.school.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { nextStudentNumber: 6 } });
    expect(tx.studentProfile.findMany.mock.calls[0][0].where.schoolId).toBe(5);
  });

  it("uses the admission format by default and reserves old widths, aliases, and unlinked legacy numbers", async () => {
    const tx = transaction(null);
    tx.studentProfile.findMany.mockResolvedValue([{ studentId: "2025/B7A/00003", admissionNumber: "2025/B7A/0007" }, { studentId: null, admissionNumber: "2024/B4A/0002" }]);
    tx.legacyStudent.findMany.mockResolvedValue([{ admissionNumber: "2025/JSS1A/00009" }, { admissionNumber: "2025/B7A/00009" }]);
    expect(await allocateStudentIds(tx as unknown as Prisma.TransactionClient, 5, [
      { className: "J.S.S 1A", sessionName: "2025/2026" },
      { className: "JSS1A", sessionName: "2025/2026" },
      { className: "Basic 4A", sessionName: "2024/2025" },
    ])).toEqual(["2025/B7A/00010", "2025/B7A/00011", "2024/B4A/00012"]);
    expect(tx.school.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { nextStudentNumber: 13 } });
    expect(tx.legacyStudent.findMany).toHaveBeenCalledWith({ where: { schoolId: 5 }, select: { admissionNumber: true } });
  });

  it("uses the stored counter to avoid reusing deleted IDs", async () => {
    const tx = transaction(null);
    tx.$queryRaw.mockResolvedValue([{ studentIdPrefix: null, studentIdDigits: 3, nextStudentNumber: 50 }]);
    expect(await allocateStudentIds(tx as unknown as Prisma.TransactionClient, 5, [{ className: "Nursery 1A", sessionName: "2025/2026" }])).toEqual(["2025/KG1A/00050"]);
  });

  it("uses all legacy numbers when allocating an existing custom prefix", async () => {
    const tx = transaction();
    expect(await allocateStudentIds(tx as unknown as Prisma.TransactionClient, 5, Array.from({ length: 4 }, () => ({ className: "Basic 4A" })))).toEqual(["SS002", "SS004", "SS005", "SS007"]);
  });

  it("rejects unusable admission context before updating the counter", async () => {
    const tx = transaction(null);
    await expect(allocateStudentIds(tx as unknown as Prisma.TransactionClient, 5, [{ className: "---", sessionName: "2025/2026" }])).rejects.toThrow(/class name or code/);
    expect(tx.school.update).not.toHaveBeenCalled();
  });
});

describe("admission ID context", () => {
  it.each([["Pre-Nursery ", "PK"], ["Nursery 1A", "KG1A"], ["Basic 4B", "B4B"], ["J.S.S 1A", "B7A"], ["JSS3B", "B9B"], ["S.S.S. 2A", "SSS2A"]])("maps %s to the existing code %s", (name, code) => {
    expect(admissionClassCode(name)).toBe(code);
  });

  it("uses original admission context for recovery even when other legacy fields disagree", () => {
    expect(studentAdmission({ admissionNumber: "2024/B7A/0001", classAtAdmission: "2024", className: "JSS2A", dateOfAdmission: new Date("2025-09-01") })).toEqual({ year: 2024, classCode: "B7A" });
    expect(studentAdmission({ admissionNumber: "2025/00003", classAtAdmission: "Pre-Nursery", className: "Basic 1A" })).toEqual({ year: 2025, classCode: "PK" });
  });

  it("uses admission date and original admission class for new students, with session-year fallback", () => {
    expect(studentAdmission({ dateOfAdmission: new Date("2023-09-01"), classAtAdmission: "Nursery 1A", className: "Basic 4A", sessionName: "2025/2026" })).toEqual({ year: 2023, classCode: "KG1A" });
    expect(studentAdmission({ className: "Basic 4A", sessionName: "2025/2026" })).toEqual({ year: 2025, classCode: "B4A" });
  });

  it("reserves recognisable legacy spelling and padding variations without modifying them", () => {
    expect(parseAdmissionStudentId("2024B3A/0002")).toEqual({ year: 2024, classCode: "B3A", sequence: 2 });
    expect(parseAdmissionStudentId("2021//KG2/001")).toEqual({ year: 2021, classCode: "KG2", sequence: 1 });
    expect(parseAdmissionStudentId("TEST1234")).toBeNull();
  });
});
