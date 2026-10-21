import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ owner: vi.fn(), findMany: vi.fn(), count: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.owner }));
vi.mock("@/lib/db", () => ({ db: { passwordAuditEvent: { findMany: mocks.findMany, count: mocks.count } } }));

import PasswordAuditPage from "../app/(portal)/settings/password-audit/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.owner.mockResolvedValue({ id: "owner", schoolId: 2 });
  mocks.findMany.mockResolvedValue([]);
  mocks.count.mockResolvedValue(0);
});

describe("password audit access", () => {
  it("requires an owner before reading history", async () => {
    mocks.owner.mockRejectedValue(new Error("owner-required"));
    await expect(PasswordAuditPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("owner-required");
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.count).not.toHaveBeenCalled();
  });

  it("scopes both the results and count to the owner's school", async () => {
    await PasswordAuditPage({ searchParams: Promise.resolve({ q: " alice ", page: "2" }) });
    const where = { schoolId: 2, accountUsername: { contains: "alice", mode: "insensitive" } };
    expect(mocks.findMany).toHaveBeenCalledWith({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: 50, take: 50 });
    expect(mocks.count).toHaveBeenCalledWith({ where });
  });

  it("handles repeated and invalid search parameters", async () => {
    await PasswordAuditPage({ searchParams: Promise.resolve({ q: ["alice", "bob"], page: "-1" }) });
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { schoolId: 2 }, skip: 0 }));
  });
});
