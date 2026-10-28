-- Set limits inside the migration transaction; Neon poolers reject startup options.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Refuse to hide existing damage behind a new constraint.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Enrollment" e LEFT JOIN "Classes" c ON c."Id" = e."classId"
    WHERE c."Id" IS NULL OR c."SchoolId" <> e."schoolId" OR c."SessionId" <> e."sessionId"
  ) THEN
    RAISE EXCEPTION 'Enrollment class/school/session mismatches exist. Audit and repair those records before applying this constraint.';
  END IF;
END $$;

CREATE UNIQUE INDEX "Classes_Id_SchoolId_SessionId_key" ON "Classes" ("Id", "SchoolId", "SessionId");
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_classId_schoolId_sessionId_fkey"
  FOREIGN KEY ("classId", "schoolId", "sessionId") REFERENCES "Classes" ("Id", "SchoolId", "SessionId")
  ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_classId_fkey";
