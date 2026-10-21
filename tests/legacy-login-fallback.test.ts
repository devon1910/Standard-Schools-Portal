import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CredentialsConfig } from "next-auth/providers/credentials";
import { pbkdf2Sync } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), query: vi.fn(), create: vi.fn(), update: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {
  portalUser: { findUnique: mocks.findUnique, update: mocks.update }, $queryRaw: mocks.query,
  $transaction: (run: (tx: unknown) => unknown) => run({ $queryRaw: mocks.audit, portalUser: { create: mocks.create } }),
} }));
vi.mock("next-auth/providers/credentials", () => ({ default: (config: object) => config }));

import { authOptions } from "../lib/auth";

const authorize = (authOptions.providers[0] as CredentialsConfig).authorize;
const request = {} as Parameters<typeof authorize>[1];

beforeEach(() => { vi.resetAllMocks(); mocks.findUnique.mockResolvedValue(null); });

describe("legacy login fallback", () => {
  it("rejects an unknown account on a fresh database without querying a missing identity table", async () => {
    mocks.query.mockResolvedValue([{ exists: false }]);
    expect(await authorize({ username: "unknown", password: "wrong-password" }, request)).toBeNull();
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("still checks legacy accounts when the legacy identity table exists", async () => {
    mocks.query.mockResolvedValueOnce([{ exists: true }]).mockResolvedValueOnce([]);
    expect(await authorize({ username: "unknown", password: "wrong-password" }, request)).toBeNull();
    expect(mocks.query).toHaveBeenCalledTimes(2);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("keeps accepting an existing portal password without rewriting it", async () => {
    const passwordHash = await hash("existing-password");
    mocks.findUnique.mockResolvedValue({ id: "owner", username: "owner", displayName: "Owner", schoolId: 1,
      school: { name: "School" }, role: "OWNER", isActive: true, passwordHash, sessionVersion: 0 });
    expect(await authorize({ username: "OWNER", password: "existing-password" }, request)).toMatchObject({ id: "owner", role: "OWNER" });
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "owner" }, data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: expect.any(Date) } });
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("records a verified legacy import without forcing a password reset", async () => {
    const salt = Buffer.alloc(16, 8);
    const legacyHash = Buffer.concat([Buffer.from([0]), salt, pbkdf2Sync("legacy-password", salt, 1000, 32, "sha1")]).toString("base64");
    mocks.query.mockResolvedValueOnce([{ exists: true }]).mockResolvedValueOnce([{ Id: "legacy-owner", UserName: "AdminUserShs2", PasswordHash: legacyHash }]);
    mocks.create.mockImplementation(async ({ data }) => ({ ...data, id: "imported", isActive: true, school: { name: "School" } }));
    expect(await authorize({ username: "adminusershs2", password: "legacy-password" }, request)).toMatchObject({ id: "imported", role: "OWNER", mustChangePassword: false });
    expect(mocks.audit.mock.calls[0].slice(1)).toEqual(["LEGACY_MIGRATION", "", "adminusershs2"]);
    expect(await verify(mocks.create.mock.calls[0][0].data.passwordHash, "legacy-password")).toBe(true);
  });
});
