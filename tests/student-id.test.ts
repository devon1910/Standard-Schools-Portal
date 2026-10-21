import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { allocateStudentIds } from "../lib/allocate-student-ids";
import { displayStudentId, formatStudentId, studentIdConfigSchema } from "../lib/student-id";

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
      school: { update: vi.fn().mockResolvedValue({}) },
    };
  }

  it("allocates a batch under a school row lock and skips existing identifiers", async () => {
    const tx = transaction();
    expect(await allocateStudentIds(tx as unknown as Prisma.TransactionClient, 5, 3)).toEqual(["SS002", "SS004", "SS005"]);
    expect(tx.$queryRaw.mock.calls[0][0].join("")).toMatch(/FOR UPDATE/);
    expect(tx.school.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { nextStudentNumber: 6 } });
    expect(tx.studentProfile.findMany.mock.calls[0][0].where.schoolId).toBe(5);
  });

  it("blocks allocation until the owner sets the format", async () => {
    const tx = transaction(null);
    await expect(allocateStudentIds(tx as unknown as Prisma.TransactionClient, 5, 1)).rejects.toThrow(/Settings/);
    expect(tx.school.update).not.toHaveBeenCalled();
  });
});
