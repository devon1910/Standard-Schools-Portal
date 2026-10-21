import { afterEach, describe, expect, it, vi } from "vitest";
import { familyHostPath, familyLoginUrl, familyPortalOrigin, safeAuthRedirect } from "../lib/family-portal";

afterEach(() => vi.unstubAllEnvs());

describe("family portal host routing", () => {
  it("works on the current deployment without a domain", () => {
    vi.stubEnv("FAMILY_PORTAL_URL", "");
    expect(familyLoginUrl()).toBe("/family/login");
    expect(familyHostPath("app.vercel.app", "/")).toBeNull();
  });

  it("routes only the exact configured host and preserves direct family paths", () => {
    vi.stubEnv("FAMILY_PORTAL_URL", "https://reports.example.com");
    expect(familyLoginUrl()).toBe("https://reports.example.com/family/login");
    expect(familyHostPath("reports.example.com", "/")).toBe("/family");
    expect(familyHostPath("reports.example.com", "/login")).toBe("/family/login");
    expect(familyHostPath("reports.example.com", "/change-password")).toBe("/family/change-password");
    expect(familyHostPath("reports.example.com.evil.test", "/")).toBeNull();
    expect(familyHostPath("admin.example.com", "/")).toBeNull();
    expect(familyHostPath("reports.example.com", "/family/reports/1")).toBeNull();
  });

  it("accepts only configured authentication redirect origins", () => {
    vi.stubEnv("FAMILY_PORTAL_URL", "https://reports.example.com");
    const base = "https://admin.example.com";
    expect(safeAuthRedirect("/dashboard", base)).toBe(`${base}/dashboard`);
    expect(safeAuthRedirect("https://reports.example.com/family", base)).toBe("https://reports.example.com/family");
    expect(safeAuthRedirect("//evil.test/family", base)).toBe(base);
    expect(safeAuthRedirect("https://reports.example.com.evil.test", base)).toBe(base);
    expect(safeAuthRedirect("javascript:alert(1)", base)).toBe(base);
  });

  it("rejects an invalid portal origin", () => {
    for (const value of ["javascript:alert(1)", "https://user:pass@example.com", "https://example.com/family", "https://example.com?next=evil"]) {
      expect(() => familyPortalOrigin(value)).toThrow();
    }
  });
});
