import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ owner: vi.fn(), student: vi.fn(), upsert: vi.fn(), updateMany: vi.fn(), hash: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.owner }));
vi.mock("@/lib/db", () => ({ db: { studentProfile: { findFirst: mocks.student }, portalUser: { upsert: mocks.upsert, updateMany: mocks.updateMany } } }));
vi.mock("@node-rs/argon2", () => ({ hash: mocks.hash }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { issueStudentLogin, setStudentLoginEnabled } from "../app/actions/family-access";

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.owner.mockResolvedValue({ schoolId: 1, id: "owner" });
  mocks.student.mockResolvedValue({ id: BigInt(8), name: "Ada" });
  mocks.upsert.mockResolvedValue({ username: "student.1.8" });
  mocks.hash.mockResolvedValue("password-hash");
});

describe("owner management of student access", () => {
  it("creates only a student role and returns a random password while storing its hash", async () => {
    const state = await issueStudentLogin({}, form({ studentProfileId: "8" }));
    expect(state.username).toBe("student.1.8");
    expect(state.temporaryPassword).toHaveLength(24);
    expect(mocks.hash).toHaveBeenCalledWith(state.temporaryPassword);
    expect(mocks.upsert.mock.calls[0][0].create).toMatchObject({ schoolId: 1, studentProfileId: BigInt(8), role: "STUDENT", passwordHash: "password-hash", mustChangePassword: true });
    expect(mocks.upsert.mock.calls[0][0].update).toMatchObject({ sessionVersion: { increment: 1 }, mustChangePassword: true, isActive: true });
    const second = await issueStudentLogin({}, form({ studentProfileId: "8" }));
    expect(second.temporaryPassword).not.toBe(state.temporaryPassword);
  });

  it("rejects a student outside the owner's school or an archived student", async () => {
    mocks.student.mockResolvedValue(null);
    expect(await issueStudentLogin({}, form({ studentProfileId: "8" }))).toMatchObject({ error: expect.any(String) });
    expect(mocks.student).toHaveBeenCalledWith({ where: { id: BigInt(8), schoolId: 1, archivedAt: null, status: { not: "ARCHIVED" } } });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("requires an owner before issuing or changing access", async () => {
    mocks.owner.mockRejectedValue(new Error("owner-required"));
    await expect(issueStudentLogin({}, form({ studentProfileId: "8" }))).rejects.toThrow("owner-required");
    await expect(setStudentLoginEnabled(form({ studentProfileId: "8", enabled: "false" }))).rejects.toThrow("owner-required");
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("disables only the linked student account in the owner's school and revokes sessions", async () => {
    await setStudentLoginEnabled(form({ studentProfileId: "8", enabled: "false" }));
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { schoolId: 1, role: "STUDENT", studentProfileId: BigInt(8) }, data: { isActive: false, sessionVersion: { increment: 1 } } });
  });

  it("cannot enable an archived student", async () => {
    await setStudentLoginEnabled(form({ studentProfileId: "8", enabled: "true" }));
    expect(mocks.updateMany.mock.calls[0][0].where.studentProfile).toEqual({ schoolId: 1, status: { not: "ARCHIVED" }, archivedAt: null });
  });
});
