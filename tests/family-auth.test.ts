import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), findFirst: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("@/lib/db", () => ({ db: { portalUser: { findFirst: mocks.findFirst } } }));

import { getSession, requireFamilyUser, requireOwner, requireUser } from "../lib/auth";

const account = {
  id: "student-account", username: "student.1.8", displayName: "Ada", schoolId: 1,
  school: { name: "School One" }, role: "STUDENT", studentProfileId: BigInt(8),
  studentProfile: { schoolId: 1, status: "ACTIVE" }, mustChangePassword: false, sessionVersion: 2,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ user: { id: account.id, schoolId: 1, sessionVersion: 2 } });
  mocks.findFirst.mockResolvedValue(account);
});

describe("student account access", () => {
  it("allows the linked student through the family guard", async () => {
    expect(await requireFamilyUser()).toMatchObject({ schoolId: 1, studentProfileId: "8", role: "STUDENT" });
  });

  it("rejects student accounts from staff and owner guards", async () => {
    await expect(requireUser()).rejects.toThrow("redirect:/family");
    await expect(requireOwner()).rejects.toThrow("redirect:/family");
  });

  it("requires password rotation before report access", async () => {
    mocks.findFirst.mockResolvedValue({ ...account, mustChangePassword: true });
    await expect(requireFamilyUser()).rejects.toThrow("redirect:/family/change-password");
  });

  it("blocks staff actions while a temporary password is still in use", async () => {
    mocks.findFirst.mockResolvedValue({ ...account, role: "STAFF", studentProfileId: null, mustChangePassword: true });
    await expect(requireUser()).rejects.toThrow("redirect:/change-password");
  });

  it("redirects staff accounts to their workspace", async () => {
    mocks.findFirst.mockResolvedValue({ ...account, role: "STAFF", studentProfileId: null });
    await expect(requireFamilyUser()).rejects.toThrow("redirect:/dashboard");
  });

  it("rejects sessions after a password reset or account disable", async () => {
    mocks.findFirst.mockResolvedValue({ ...account, sessionVersion: 3 });
    expect(await getSession()).toBeNull();
    mocks.findFirst.mockResolvedValue(null);
    await expect(requireFamilyUser()).rejects.toThrow("redirect:/family/login");
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: account.id, schoolId: 1, isActive: true } }));
  });

  it("rejects archived students and incorrect school links", async () => {
    for (const studentProfile of [{ schoolId: 1, status: "ARCHIVED" }, { schoolId: 2, status: "ACTIVE" }, null]) {
      mocks.findFirst.mockResolvedValue({ ...account, studentProfile });
      expect(await getSession()).toBeNull();
    }
  });
});
