-- Manual repair. This file is not part of automatic deployment migrations.
-- Review docs/STUDENT_DATA_REPAIR.md and take a backup before applying it.
-- It changes only Enrollment.classId and Enrollment.updatedAt.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Keep the reviewed class mapping and row counts stable until the commit.
LOCK TABLE "Classes", "Enrollment", "ResultScore", "TermReport" IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  mappings CONSTANT jsonb := '[
    {"source_id":1,"target_id":87,"expected":15},
    {"source_id":2,"target_id":90,"expected":14},
    {"source_id":4,"target_id":91,"expected":15},
    {"source_id":5,"target_id":92,"expected":15},
    {"source_id":7,"target_id":93,"expected":5},
    {"source_id":8,"target_id":94,"expected":6},
    {"source_id":10,"target_id":95,"expected":12},
    {"source_id":11,"target_id":96,"expected":10},
    {"source_id":13,"target_id":97,"expected":9},
    {"source_id":14,"target_id":98,"expected":11},
    {"source_id":16,"target_id":99,"expected":16},
    {"source_id":19,"target_id":101,"expected":16},
    {"source_id":20,"target_id":102,"expected":11},
    {"source_id":23,"target_id":103,"expected":14},
    {"source_id":86,"target_id":88,"expected":11}
  ]';
  matched integer;
  changed integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Sessions" WHERE "Id" = 3 AND "SchoolId" = 1 AND "Name" = '2025/2026') THEN
    RAISE EXCEPTION 'The reviewed school/session is missing. Run the audit again.';
  END IF;

  SELECT count(*) INTO matched
  FROM jsonb_to_recordset(mappings) AS m(source_id integer, target_id integer, expected integer)
  JOIN "Classes" source ON source."Id" = m.source_id
  JOIN "Classes" target ON target."Id" = m.target_id
  WHERE source."SchoolId" = 1 AND source."SessionId" = 1
    AND target."SchoolId" = 1 AND target."SessionId" = 3 AND target."archivedAt" IS NULL
    AND source."ClassTypeId" = target."ClassTypeId"
    AND regexp_replace(upper(source."Name"), '[[:space:]_.-]+', '', 'g') = regexp_replace(upper(target."Name"), '[[:space:]_.-]+', '', 'g')
    AND (SELECT count(*) FROM "Classes" candidate
      WHERE candidate."SchoolId" = 1 AND candidate."SessionId" = 3 AND candidate."archivedAt" IS NULL
        AND regexp_replace(upper(candidate."Name"), '[[:space:]_.-]+', '', 'g') = regexp_replace(upper(source."Name"), '[[:space:]_.-]+', '', 'g')) = 1;
  IF matched <> 15 THEN
    RAISE EXCEPTION 'Class mappings have changed or are ambiguous. Run the audit again.';
  END IF;

  SELECT count(*) INTO matched
  FROM jsonb_to_recordset(mappings) AS m(source_id integer, target_id integer, expected integer)
  WHERE (SELECT count(*) FROM "Enrollment" e WHERE e."schoolId" = 1 AND e."sessionId" = 3 AND e."classId" = m.source_id) = m.expected;
  IF matched <> 15 THEN
    RAISE EXCEPTION 'Enrollment counts differ from the reviewed 180 records. Run the audit again; do not rerun an already completed repair.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Enrollment" e
    JOIN jsonb_to_recordset(mappings) AS m(source_id integer, target_id integer, expected integer) ON m.source_id = e."classId"
    WHERE e."schoolId" = 1 AND e."sessionId" = 3 AND (
      EXISTS (SELECT 1 FROM "ResultScore" s WHERE s."enrollmentId" = e.id)
      OR EXISTS (SELECT 1 FROM "TermReport" r WHERE r."enrollmentId" = e.id)
    )
  ) THEN
    RAISE EXCEPTION 'Affected enrollments now have scores or reports. Review those records before applying this repair.';
  END IF;

  UPDATE "Enrollment" e SET "classId" = m.target_id, "updatedAt" = CURRENT_TIMESTAMP
  FROM jsonb_to_recordset(mappings) AS m(source_id integer, target_id integer, expected integer)
  WHERE e."schoolId" = 1 AND e."sessionId" = 3 AND e."classId" = m.source_id;
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 180 THEN
    RAISE EXCEPTION 'Expected 180 corrected enrollments, got %. The repair is rolled back.', changed;
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Enrollment" e JOIN "Classes" c ON c."Id" = e."classId"
    WHERE e."schoolId" = 1 AND e."sessionId" = 3
      AND (c."SchoolId" <> e."schoolId" OR c."SessionId" <> e."sessionId")
  ) THEN
    RAISE EXCEPTION 'Class/session mismatches remain. The repair is rolled back.';
  END IF;
  RAISE NOTICE 'Corrected 180 class links. Student profiles, identifiers, fees, and legacy rows are unchanged.';
END $$;

COMMIT;
