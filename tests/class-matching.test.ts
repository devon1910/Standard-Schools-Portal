import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ classes: vi.fn(), create: vi.fn(), createMany: vi.fn(), session: vi.fn(), redirect: vi.fn(), transaction: vi.fn(), profile: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireOwner: vi.fn().mockResolvedValue({ schoolId: 1, id: "owner" }), requireUser: vi.fn().mockResolvedValue({ schoolId: 1, id: "owner" }) }));
vi.mock("@/lib/allocate-student-ids", () => ({ allocateStudentIds: vi.fn().mockResolvedValue(["SHS001"]), StudentIdSetupRequired: class extends Error {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/db", () => ({ db: {
  $transaction: mocks.transaction,
  legacyClass: { findMany: mocks.classes, findFirst: vi.fn().mockResolvedValue(null), create: mocks.create, createMany: mocks.createMany },
  legacyClassType: { findFirst: vi.fn().mockResolvedValue({ id: 3 }) },
  legacySession: { findFirst: mocks.session },
} }));
import { cloneSessionClasses, createClass, importStudents } from "../app/actions/admin";
import { studentImportRowSchema } from "../lib/student-import";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.redirect.mockImplementation((url) => { throw new Error(`REDIRECT ${url}`); });
  mocks.session.mockResolvedValue({ id: 6 });
  mocks.transaction.mockImplementation((callback) => callback({ studentProfile: { create: mocks.profile } }));
});

describe("class name matching", () => {
  it("rejects a new class that differs only in spacing and case", async () => {
    mocks.classes.mockResolvedValue([{ id: 4, name: "JSS 1A" }]);
    const form = new FormData();
    Object.entries({ name: "jss1a", classTeacher: "", classTypeId: "3", sessionId: "6" }).forEach(([key, value]) => form.set(key, value));
    await expect(createClass(form)).rejects.toThrow("REDIRECT /academics?error=class-exists");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("does not clone another copy of an equivalent class in the target session", async () => {
    mocks.classes.mockResolvedValueOnce([{ name: "JSS1A", classTypeId: 3, classTeacher: null }]).mockResolvedValueOnce([{ name: "JSS 1A" }]);
    const form = new FormData();
    form.set("sourceSessionId", "5");
    form.set("targetSessionName", "2026/2027");
    await expect(cloneSessionClasses(form)).rejects.toThrow("REDIRECT /promotion?source=5&target=6");
    expect(mocks.createMany).toHaveBeenCalledWith({ data: [] });
  });

  const imported = studentImportRowSchema.parse({ rowNumber: 2, firstName: "Ada", lastName: "Okafor", className: "jss1a", gender: "Female", dob: "2014-05-12" });

  it("imports a spacing variant into one matching class in the selected session", async () => {
    mocks.classes.mockResolvedValue([{ id: 4, name: "JSS 1A" }]);
    await expect(importStudents({ sessionId: 6, rows: [imported] })).resolves.toEqual({ success: true, imported: 1, errors: [] });
    expect(mocks.classes).toHaveBeenCalledWith(expect.objectContaining({ where: { sessionId: 6, schoolId: 1, archivedAt: null } }));
    expect(mocks.profile.mock.calls[0][0].data.enrollments.create).toEqual({ schoolId: 1, sessionId: 6, classId: 4 });
  });

  it("rejects ambiguous class names instead of assigning a student to an arbitrary class", async () => {
    mocks.classes.mockResolvedValue([{ id: 4, name: "JSS 1A" }, { id: 5, name: "JSS1A" }]);
    const result = await importStudents({ sessionId: 6, rows: [imported] });
    expect(result).toMatchObject({ success: false, imported: 0, errors: [{ rowNumber: 2 }] });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
