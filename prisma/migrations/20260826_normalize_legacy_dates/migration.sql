-- Npgsql mapped DateTime.MinValue to PostgreSQL -infinity in the legacy API.
-- Prisma requires finite JavaScript-compatible timestamps.
UPDATE "Sessions"
SET "DateCreated" = TIMESTAMPTZ '1970-01-01 00:00:00+00'
WHERE NOT isfinite("DateCreated");

UPDATE "ClassTypes"
SET "DateCreated" = TIMESTAMPTZ '1970-01-01 00:00:00+00'
WHERE NOT isfinite("DateCreated");

UPDATE "Classes"
SET "DateCreated" = TIMESTAMPTZ '1970-01-01 00:00:00+00'
WHERE NOT isfinite("DateCreated");

UPDATE "Subjects"
SET "DateCreated" = TIMESTAMPTZ '1970-01-01 00:00:00+00'
WHERE NOT isfinite("DateCreated");

UPDATE "Questions"
SET "DateCreated" = TIMESTAMPTZ '1970-01-01 00:00:00+00'
WHERE NOT isfinite("DateCreated");

UPDATE "Students"
SET "DateCreated" = TIMESTAMPTZ '1970-01-01 00:00:00+00'
WHERE NOT isfinite("DateCreated");

UPDATE "Sessions" SET "DateModified" = NULL
WHERE "DateModified" IS NOT NULL AND NOT isfinite("DateModified");
UPDATE "ClassTypes" SET "DateModified" = NULL
WHERE "DateModified" IS NOT NULL AND NOT isfinite("DateModified");
UPDATE "Classes" SET "DateModified" = NULL
WHERE "DateModified" IS NOT NULL AND NOT isfinite("DateModified");
UPDATE "Subjects" SET "DateModified" = NULL
WHERE "DateModified" IS NOT NULL AND NOT isfinite("DateModified");
UPDATE "Questions" SET "DateModified" = NULL
WHERE "DateModified" IS NOT NULL AND NOT isfinite("DateModified");
UPDATE "Students" SET "DateModified" = NULL
WHERE "DateModified" IS NOT NULL AND NOT isfinite("DateModified");
