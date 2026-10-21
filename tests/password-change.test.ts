import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ account: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), queryRaw: vi.fn(), hash: vi.fn(), verify: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAccount: mocks.account }));
vi.mock("@/lib/db", () => ({ db: {
  portalUser: { findFirst: mocks.findFirst },
  $transaction: (run: (tx: unknown) => unknown) => run({ $queryRaw: mocks.queryRaw, portalUser: { updateMany: mocks.updateMany } }),
} }));
vi.mock("@node-rs/argon2", () => ({ hash: mocks.hash, verify: mocks.verify }));

import { changePassword } from "../app/actions/auth";

function form() {
  const data = new FormData();
  data.set("currentPassword", "current-password");
  data.set("newPassword", "new-password");
  data.set("confirmPassword", "new-password");
  // The actor comes from the session. Submitted identities must have no effect.
  data.set("actorId", "someone-else");
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.account.mockResolvedValue({ id: "account", schoolId: 1, sessionVersion: 3 });
  mocks.findFirst.mockResolvedValue({ id: "account", passwordHash: "old-hash" });
  mocks.verify.mockResolvedValue(true);
  mocks.hash.mockResolvedValue("new-hash");
  mocks.updateMany.mockResolvedValue({ count: 1 });
  mocks.queryRaw.mockResolvedValue([]);
});

describe("audited password changes", () => {
  it("uses the signed-in account as the actor and rejects stale credentials", async () => {
    expect(await changePassword({}, form())).toEqual({ success: true });
    expect(mocks.queryRaw.mock.calls[0].slice(1)).toEqual(["SELF_SERVICE", "account", ""]);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "account", schoolId: 1, isActive: true, sessionVersion: 3, passwordHash: "old-hash" },
      data: { passwordHash: "new-hash", mustChangePassword: false, sessionVersion: { increment: 1 } },
    });
    mocks.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await changePassword({}, form())).toEqual({ error: expect.stringContaining("Sign in again") });
  });

  it("does not write a password or an audit event when the current password is wrong", async () => {
    mocks.verify.mockResolvedValue(false);
    expect(await changePassword({}, form())).toEqual({ error: "Current password is incorrect." });
    expect(mocks.queryRaw).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("stops the password write if the audit context fails", async () => {
    mocks.queryRaw.mockRejectedValueOnce(new Error("audit-unavailable"));
    await expect(changePassword({}, form())).rejects.toThrow("audit-unavailable");
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
