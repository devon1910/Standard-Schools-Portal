ALTER TABLE "School"
  ADD COLUMN "studentIdPrefix" TEXT,
  ADD COLUMN "studentIdDigits" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "nextStudentNumber" INTEGER NOT NULL DEFAULT 1,
  ADD CONSTRAINT "School_student_id_config_check" CHECK (
    ("studentIdPrefix" IS NULL OR "studentIdPrefix" ~ '^[A-Z][A-Z-]{0,19}$')
    AND "studentIdDigits" BETWEEN 1 AND 10 AND "nextStudentNumber" > 0
  );

-- Existing identifiers remain unchanged. Only new profiles receive a studentId.
ALTER TABLE "StudentProfile" ADD COLUMN "studentId" TEXT;
CREATE UNIQUE INDEX "StudentProfile_schoolId_studentId_key" ON "StudentProfile" ("schoolId", "studentId");

CREATE FUNCTION prevent_student_id_format_change() RETURNS trigger AS $$
BEGIN
  IF OLD."studentIdPrefix" IS NOT NULL AND (
    NEW."studentIdPrefix" IS DISTINCT FROM OLD."studentIdPrefix" OR
    NEW."studentIdDigits" IS DISTINCT FROM OLD."studentIdDigits"
  ) THEN
    RAISE EXCEPTION 'The student ID format can only be set once.';
  END IF;
  IF OLD."studentIdPrefix" IS NOT NULL AND NEW."nextStudentNumber" < OLD."nextStudentNumber" THEN
    RAISE EXCEPTION 'The student ID sequence cannot move backwards.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "School_student_id_format_immutable"
  BEFORE UPDATE ON "School" FOR EACH ROW EXECUTE FUNCTION prevent_student_id_format_change();
