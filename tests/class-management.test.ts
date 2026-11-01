import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  owner: vi.fn(), transaction: vi.fn(), findClass: vi.fn(), updateClass: vi.fn(),
  teacherHistory: vi.fn(), findEnrollments: vi.fn(), updateEnrollments: vi.fn(),
  enrollmentHistory: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireOwner: mocks.owner, requireUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));

import { transferStudents, updateClassTeacher } from "../app/actions/admin";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.owner.mockResolvedValue({ schoolId: 1, id: "owner", name: "School Owner" });
  mocks.transaction.mockImplementation((callback) => callback({
    legacyClass: { findFirst: mocks.findClass, update: mocks.updateClass },
    classTeacherChange: { create: mocks.teacherHistory },
    enrollment: { findMany: mocks.findEnrollments, updateMany: mocks.updateEnrollments },
    enrollmentClassChange: { createMany: mocks.enrollmentHistory },
  }));
});

describe("class teacher changes", () => {
  it("updates the current teacher and records the previous value atomically", async () => {
    mocks.findClass.mockResolvedValue({ id: 10, classTeacher: "Mrs Old" });
    const form = new FormData();
    form.set("classId", "10");
    form.set("classTeacher", "Mr New");

    await updateClassTeacher(form);

    expect(mocks.teacherHistory).toHaveBeenCalledWith({ data: expect.objectContaining({
      schoolId: 1, classId: 10, previousTeacher: "Mrs Old", newTeacher: "Mr New",
      changedById: "owner", changedByName: "School Owner",
    }) });
    expect(mocks.updateClass).toHaveBeenCalledWith({
      where: { id: 10 },
      data: expect.objectContaining({ classTeacher: "Mr New", modifiedBy: "owner" }),
    });
  });

  it("does not add history when the teacher did not change", async () => {
    mocks.findClass.mockResolvedValue({ id: 10, classTeacher: "Mrs Same" });
    const form = new FormData();
    form.set("classId", "10");
    form.set("classTeacher", "Mrs Same");
    await updateClassTeacher(form);
    expect(mocks.teacherHistory).not.toHaveBeenCalled();
    expect(mocks.updateClass).not.toHaveBeenCalled();
  });
});

describe("student class transfers", () => {
  it("moves only valid selected enrollments and records each changed class", async () => {
    mocks.findClass.mockResolvedValue({ id: 30 });
    mocks.findEnrollments.mockResolvedValue([
      { id: BigInt(101), classId: 20 },
      { id: BigInt(102), classId: 21 },
    ]);
    const form = new FormData();
    form.set("sessionId", "6");
    form.set("targetClassId", "30");
    form.append("enrollmentIds", "101");
    form.append("enrollmentIds", "102");

    await transferStudents(form);

    expect(mocks.findClass).toHaveBeenCalledWith({ where: { id: 30, schoolId: 1, sessionId: 6, archivedAt: null }, select: { id: true } });
    expect(mocks.enrollmentHistory.mock.calls[0][0].data).toEqual([
      expect.objectContaining({ enrollmentId: BigInt(101), previousClassId: 20, newClassId: 30 }),
      expect.objectContaining({ enrollmentId: BigInt(102), previousClassId: 21, newClassId: 30 }),
    ]);
    expect(mocks.updateEnrollments).toHaveBeenCalledWith({
      where: { id: { in: [BigInt(101), BigInt(102)] }, schoolId: 1, sessionId: 6 },
      data: { classId: 30 },
    });
  });

  it("rejects a destination class outside the selected school and session", async () => {
    mocks.findClass.mockResolvedValue(null);
    const form = new FormData();
    form.set("sessionId", "6");
    form.set("targetClassId", "99");
    form.append("enrollmentIds", "101");
    await expect(transferStudents(form)).rejects.toThrow(/valid destination class/);
    expect(mocks.findEnrollments).not.toHaveBeenCalled();
  });

  it("rejects the whole transfer when any selected enrollment is invalid", async () => {
    mocks.findClass.mockResolvedValue({ id: 30 });
    mocks.findEnrollments.mockResolvedValue([{ id: BigInt(101), classId: 20 }]);
    const form = new FormData();
    form.set("sessionId", "6");
    form.set("targetClassId", "30");
    form.append("enrollmentIds", "101");
    form.append("enrollmentIds", "102");
    await expect(transferStudents(form)).rejects.toThrow(/selected enrollments are invalid/);
    expect(mocks.enrollmentHistory).not.toHaveBeenCalled();
    expect(mocks.updateEnrollments).not.toHaveBeenCalled();
  });
});
