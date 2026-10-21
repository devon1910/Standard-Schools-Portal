import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CredentialsConfig } from "next-auth/providers/credentials";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), query: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { portalUser: { findUnique: mocks.findUnique, create: mocks.create }, $queryRaw: mocks.query } }));
vi.mock("next-auth/providers/credentials", () => ({ default: (config: object) => config }));

import { authOptions } from "../lib/auth";

const authorize = (authOptions.providers[0] as CredentialsConfig).authorize;
const request = {} as Parameters<typeof authorize>[1];

beforeEach(() => { vi.clearAllMocks(); mocks.findUnique.mockResolvedValue(null); });

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
});
