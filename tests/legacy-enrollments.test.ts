import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ students: vi.fn(), classes: vi.fn(), imported: vi.fn(), profile: vi.fn(), enrollment: vi.fn() }));
vi.mock("../lib/db", () => ({ db: {
  legacyStudent: { findMany: mocks.students }, legacyClass: { findMany: mocks.classes },
  enrollment: { findUnique: mocks.imported, upsert: mocks.enrollment, count: vi.fn() },
  studentProfile: { create: mocks.profile, count: vi.fn() },
} }));
import { backfillLegacyStudents } from "../prisma/backfill";

const row = { id: BigInt(1), schoolId: 1, sessionId: 5, classId: 10, admissionNumber: "SHS001", name: "Ada Okafor", dob: new Date("2014-05-12"), dateCreated: new Date("2025-09-01"), dateModified: null };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.classes.mockResolvedValue([{ id: 10, schoolId: 1, sessionId: 5 }]);
  mocks.imported.mockResolvedValue({ id: BigInt(20) });
});

describe("legacy enrollment preflight", () => {
  it.each([
    { id: 10, schoolId: 1, sessionId: 4 },
    { id: 10, schoolId: 2, sessionId: 5 },
  ])("stops before writing when a legacy class belongs to another session or school", async (classInfo) => {
    mocks.students.mockResolvedValue([row]);
    mocks.classes.mockResolvedValue([classInfo]);
    await expect(backfillLegacyStudents()).rejects.toThrow(/does not belong/);
    expect(mocks.imported).not.toHaveBeenCalled();
    expect(mocks.profile).not.toHaveBeenCalled();
    expect(mocks.enrollment).not.toHaveBeenCalled();
  });

  it("rejects a missing class reference", async () => {
    mocks.students.mockResolvedValue([row]);
    mocks.classes.mockResolvedValue([]);
    await expect(backfillLegacyStudents()).rejects.toThrow(/class 10 does not belong/);
  });

  it.each([{ name: "Bola Musa" }, { dob: new Date("2013-05-12") }])("does not silently discard students with conflicting identities and a shared admission number", async (difference) => {
    mocks.students.mockResolvedValue([row, { ...row, ...difference, id: BigInt(2), admissionNumber: " shs001 " }]);
    await expect(backfillLegacyStudents()).rejects.toThrow(/different names or dates of birth/);
    expect(mocks.imported).not.toHaveBeenCalled();
    expect(mocks.enrollment).not.toHaveBeenCalled();
  });

  it("checks admission identities across sessions before merging profiles", async () => {
    mocks.classes.mockResolvedValue([{ id: 10, schoolId: 1, sessionId: 5 }, { id: 11, schoolId: 1, sessionId: 6 }]);
    mocks.students.mockResolvedValue([row, { ...row, id: BigInt(2), classId: 11, sessionId: 6, name: "Bola Musa" }]);
    await expect(backfillLegacyStudents()).rejects.toThrow(/different names or dates of birth/);
  });

  it("permits repeated legacy entries for the same identity and preserves existing enrollments", async () => {
    mocks.students.mockResolvedValue([row, { ...row, id: BigInt(2), name: " ada  okafor " }]);
    await backfillLegacyStudents();
    expect(mocks.imported).toHaveBeenCalledTimes(1);
    expect(mocks.profile).not.toHaveBeenCalled();
    expect(mocks.enrollment).not.toHaveBeenCalled();
  });

  it("keeps the most recently changed duplicate even when an older row has no modification date", async () => {
    // PostgreSQL sorts null modification dates last for the current ascending query.
    mocks.students.mockResolvedValue([{ ...row, id: BigInt(2), dateModified: new Date("2026-01-01") }, row]);
    await backfillLegacyStudents();
    expect(mocks.imported).toHaveBeenCalledExactlyOnceWith({ where: { legacyStudentId: BigInt(2) }, select: { id: true } });
  });
});
