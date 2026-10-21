-- Run before the rewrite that adds relations to these tables.
-- Existing databases keep their legacy tables and rows unchanged.
DO $$
DECLARE
  legacy_tables TEXT[] := ARRAY['Sessions', 'Terms', 'ClassTypes', 'Classes', 'Subjects', 'Questions', 'Students'];
  existing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO existing_count
  FROM information_schema.tables
  WHERE table_schema = current_schema()
    AND table_type = 'BASE TABLE'
    AND table_name = ANY(legacy_tables);

  IF existing_count = array_length(legacy_tables, 1) THEN
    RETURN;
  END IF;

  IF existing_count > 0 THEN
    RAISE EXCEPTION 'The database has only % of the 7 required legacy tables. Check DATABASE_URL and search_path, or restore the missing legacy tables before retrying.', existing_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema <> current_schema()
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
      AND table_name = ANY(legacy_tables)
  ) THEN
    RAISE EXCEPTION 'Legacy school tables exist in another schema. Correct the DATABASE_URL search_path before retrying.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name <> '_prisma_migrations'
  ) THEN
    RAISE EXCEPTION 'The database schema is not empty, but the legacy school tables are missing. Check DATABASE_URL and search_path, or restore the legacy tables before retrying.';
  END IF;

  CREATE TABLE "Sessions" (
    "Id" SERIAL PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "SchoolId" INTEGER NOT NULL,
    "DateCreated" TIMESTAMP(3) NOT NULL,
    "DateModified" TIMESTAMP(3),
    "ModifiedBy" TEXT
  );

  CREATE TABLE "Terms" (
    "Id" SERIAL PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "SchoolId" INTEGER NOT NULL
  );

  CREATE TABLE "ClassTypes" (
    "Id" SERIAL PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "SchoolId" INTEGER NOT NULL,
    "DateCreated" TIMESTAMP(3) NOT NULL,
    "DateModified" TIMESTAMP(3),
    "ModifiedBy" TEXT
  );

  CREATE TABLE "Classes" (
    "Id" SERIAL PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "ClassTeacher" TEXT,
    "ClassTypeId" INTEGER NOT NULL,
    "SessionId" INTEGER NOT NULL,
    "SchoolId" INTEGER NOT NULL,
    "DateCreated" TIMESTAMP(3) NOT NULL,
    "DateModified" TIMESTAMP(3),
    "ModifiedBy" TEXT
  );
  CREATE INDEX "Classes_SchoolId_SessionId_idx" ON "Classes"("SchoolId", "SessionId");

  CREATE TABLE "Subjects" (
    "Id" SERIAL PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "ClassTypeId" INTEGER NOT NULL,
    "SchoolId" INTEGER NOT NULL,
    "DateCreated" TIMESTAMP(3) NOT NULL,
    "DateModified" TIMESTAMP(3),
    "ModifiedBy" TEXT
  );
  CREATE INDEX "Subjects_SchoolId_ClassTypeId_idx" ON "Subjects"("SchoolId", "ClassTypeId");

  CREATE TABLE "Questions" (
    "Id" SERIAL PRIMARY KEY,
    "QuestionURL" TEXT NOT NULL,
    "Type" TEXT NOT NULL,
    "SubjectId" INTEGER NOT NULL,
    "TermId" INTEGER NOT NULL,
    "SessionId" INTEGER NOT NULL,
    "ClassId" INTEGER NOT NULL,
    "FilePublicId" TEXT NOT NULL,
    "SchoolId" INTEGER NOT NULL,
    "DateCreated" TIMESTAMP(3) NOT NULL,
    "DateModified" TIMESTAMP(3),
    "ModifiedBy" TEXT
  );
  CREATE INDEX "Questions_SchoolId_SessionId_TermId_ClassId_idx" ON "Questions"("SchoolId", "SessionId", "TermId", "ClassId");

  CREATE TABLE "Students" (
    "Id" BIGSERIAL PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "AdmissionNumber" TEXT NOT NULL,
    "Gender" TEXT NOT NULL,
    "Dob" TIMESTAMP(3) NOT NULL,
    "Tribe" TEXT NOT NULL,
    "StateOfOrigin" TEXT NOT NULL,
    "LGAOfOrigin" TEXT NOT NULL,
    "ClassAtAdmission" TEXT NOT NULL,
    "DateOfAdmission" TIMESTAMP(3) NOT NULL,
    "YearOfAdmission" TEXT NOT NULL,
    "ParentName" TEXT NOT NULL,
    "ParentAddress" TEXT NOT NULL,
    "ParentPhone" TEXT NOT NULL,
    "ParentReligion" TEXT NOT NULL,
    "ClassId" INTEGER NOT NULL,
    "SessionId" INTEGER NOT NULL,
    "SchoolId" INTEGER NOT NULL,
    "IsFirstTermFeePaid" BOOLEAN NOT NULL,
    "FirstTermBalance" DECIMAL(18,2) NOT NULL,
    "IsSecondTermFeePaid" BOOLEAN NOT NULL,
    "SecondTermBalance" DECIMAL(18,2) NOT NULL,
    "IsThirdTermFeePaid" BOOLEAN NOT NULL,
    "ThirdTermBalance" DECIMAL(18,2) NOT NULL,
    "Balance" DECIMAL(65,30) NOT NULL,
    "DateCreated" TIMESTAMP(3) NOT NULL,
    "DateModified" TIMESTAMP(3),
    "ModifiedBy" TEXT
  );
END;
$$ LANGUAGE plpgsql;
