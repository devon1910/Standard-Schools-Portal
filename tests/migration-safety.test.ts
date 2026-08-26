import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve("prisma/migrations/20260824_fullstack_rewrite/migration.sql"), "utf8");

describe("production migration safety", () => {
  it("is additive and preserves legacy student and identity tables", () => {
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
    expect(migration).not.toMatch(/ALTER\s+TABLE\s+"Students"/i);
    expect(migration).not.toMatch(/AspNetUsers/i);
  });

  it("adds the normalized continuity and result tables", () => {
    for (const table of ["School", "PortalUser", "StudentProfile", "Enrollment", "ClassSubject", "ResultScore", "TermSetup", "TermReport"]) {
      expect(migration).toContain(`CREATE TABLE "${table}"`);
    }
  });
});
