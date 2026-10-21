ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STUDENT';
ALTER TABLE "PortalUser"
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "studentProfileId" BIGINT,
  ADD CONSTRAINT "PortalUser_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  -- Cast to text so the new enum value is safe within the migration transaction.
  ADD CONSTRAINT "PortalUser_student_role_check" CHECK (
    ("role"::text = 'STUDENT') = ("studentProfileId" IS NOT NULL)
  );
CREATE UNIQUE INDEX "PortalUser_studentProfileId_key" ON "PortalUser" ("studentProfileId");
