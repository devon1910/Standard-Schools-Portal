import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve("prisma/migrations/20260824_fullstack_rewrite/migration.sql"), "utf8");
const studentIds = readFileSync(resolve("prisma/migrations/20261021_student_ids/migration.sql"), "utf8");
const familyPortal = readFileSync(resolve("prisma/migrations/20261022_family_portal/migration.sql"), "utf8");

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

  it("preserves existing identifiers and locks the school ID format after setup", () => {
    expect(studentIds).not.toMatch(/DROP\s+(TABLE|COLUMN)|UPDATE\s+"StudentProfile"|ALTER\s+TABLE\s+"Students"/i);
    expect(studentIds).toContain('"StudentProfile_schoolId_studentId_key"');
    expect(studentIds).toContain('OLD."studentIdPrefix" IS NOT NULL');
    expect(studentIds).toContain('NEW."studentIdDigits" IS DISTINCT FROM OLD."studentIdDigits"');
  });

  it("adds student access without changing existing accounts or credentials", () => {
    expect(familyPortal).not.toMatch(/DROP\s+(TABLE|COLUMN)|UPDATE\s+"PortalUser"|ALTER\s+TABLE\s+"Students"/i);
    expect(familyPortal).toContain('"sessionVersion" INTEGER NOT NULL DEFAULT 0');
    expect(familyPortal).toContain('REFERENCES "StudentProfile"("id") ON DELETE CASCADE');
    expect(familyPortal).toContain('("role"::text = \'STUDENT\') = ("studentProfileId" IS NOT NULL)');
  });
});
