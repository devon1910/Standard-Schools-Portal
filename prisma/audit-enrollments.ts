import { Client } from "pg";
import { z } from "zod";

const [schoolId, sessionName] = z.tuple([z.coerce.number().int().positive(), z.string().min(1)]).parse(process.argv.slice(2));
const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000 });

try {
  await client.connect();
  // This audit must never change school records.
  await client.query("BEGIN READ ONLY");
  const sessions = await client.query(`
    SELECT s."Id" AS id, s."Name" AS name, school.name AS school
    FROM "Sessions" s JOIN "School" school ON school.id = s."SchoolId"
    WHERE s."SchoolId" = $1 AND trim(s."Name") = $2
  `, [schoolId, sessionName]);
  if (sessions.rows.length !== 1) throw new Error(`Expected one session; found ${sessions.rows.length}. Check the school ID and session name.`);
  const sessionId = sessions.rows[0].id;
  console.log("Session:", sessions.rows[0]);

  const classes = await client.query(`
    SELECT c."Id" AS id, c."Name" AS name, c."archivedAt" IS NOT NULL AS archived,
      (SELECT count(*) FROM "Students" l WHERE l."SchoolId"=$1 AND l."SessionId"=$2 AND l."ClassId"=c."Id") AS legacy_rows,
      (SELECT count(*) FROM "Enrollment" e WHERE e."schoolId"=$1 AND e."sessionId"=$2 AND e."classId"=c."Id" AND e.active) AS active_enrollments,
      (SELECT count(*) FROM "Enrollment" e WHERE e."schoolId"=$1 AND e."sessionId"=$2 AND e."classId"=c."Id" AND NOT e.active) AS inactive_enrollments
    FROM "Classes" c WHERE c."SchoolId"=$1 AND c."SessionId"=$2 ORDER BY c."Name", c."Id"
  `, [schoolId, sessionId]);
  console.table(classes.rows);

  const mismatches = await client.query(`
    SELECT e.id AS enrollment_id, e."classId" AS class_id, c."Name" AS class_name,
      c."SessionId" AS class_session_id, c."SchoolId" AS class_school_id,
      c."archivedAt" IS NOT NULL AS class_archived, e.active,
      p.status AS student_status, p."schoolId" AS profile_school_id
    FROM "Enrollment" e
    LEFT JOIN "Classes" c ON c."Id"=e."classId"
    LEFT JOIN "StudentProfile" p ON p.id=e."studentId"
    WHERE e."schoolId"=$1 AND e."sessionId"=$2 AND
      (c."Id" IS NULL OR c."SessionId"<>e."sessionId" OR c."SchoolId"<>e."schoolId"
        OR c."archivedAt" IS NOT NULL OR p.id IS NULL OR p."schoolId"<>e."schoolId" OR NOT e.active)
  `, [schoolId, sessionId]);
  console.log("Enrollments with mismatched, archived, or inactive records:");
  console.table(mismatches.rows);

  const unlinked = await client.query(`
    SELECT l."Id" AS legacy_id, l."ClassId" AS class_id,
      c."Name" AS class_name, c."SessionId" AS class_session_id, c."SchoolId" AS class_school_id,
      (SELECT count(*) FROM "Students" other
        WHERE other."SchoolId"=l."SchoolId" AND other."SessionId"=l."SessionId"
          AND trim(l."AdmissionNumber")<>''
          AND upper(trim(other."AdmissionNumber"))=upper(trim(l."AdmissionNumber"))) AS admission_group_size,
      (SELECT count(*) FROM "StudentProfile" p JOIN "Enrollment" e ON e."studentId"=p.id
        WHERE p."schoolId"=$1 AND e."schoolId"=$1 AND e."sessionId"=$2
          AND trim(l."AdmissionNumber")<>'' AND upper(trim(p."admissionNumber"))=upper(trim(l."AdmissionNumber"))) AS matching_admission_enrollments
    FROM "Students" l LEFT JOIN "Classes" c ON c."Id"=l."ClassId"
    WHERE l."SchoolId"=$1 AND l."SessionId"=$2
      AND NOT EXISTS (SELECT 1 FROM "Enrollment" e WHERE e."legacyStudentId"=l."Id")
    ORDER BY l."ClassId", l."Id"
  `, [schoolId, sessionId]);
  console.log("Legacy rows without a linked enrollment (duplicate admissions may have been superseded by the backfill):");
  console.table(unlinked.rows);

  const duplicates = await client.query(`
    SELECT regexp_replace(upper(c."Name"), '[[:space:]_.-]+', '', 'g') AS normalized_name,
      array_agg(c."Id" ORDER BY c."Id") AS class_ids
    FROM "Classes" c WHERE c."SchoolId"=$1 AND c."SessionId"=$2 AND c."archivedAt" IS NULL
    GROUP BY 1 HAVING count(*)>1
  `, [schoolId, sessionId]);
  console.log("Classes with the same normalized name:");
  console.table(duplicates.rows);

  const identityConflicts = await client.query(`
    SELECT array_agg(l."Id" ORDER BY l."Id") AS legacy_ids,
      array_agg(DISTINCT l."SessionId") AS session_ids,
      count(DISTINCT (regexp_replace(upper(trim(l."Name")), '[[:space:]]+', ' ', 'g'), l."Dob")) AS different_identities
    FROM "Students" l WHERE l."SchoolId"=$1 AND trim(l."AdmissionNumber")<>''
    GROUP BY upper(trim(l."AdmissionNumber"))
    HAVING count(DISTINCT (regexp_replace(upper(trim(l."Name")), '[[:space:]]+', ' ', 'g'), l."Dob"))>1
      AND bool_or(l."SessionId"=$2)
  `, [schoolId, sessionId]);
  console.log("Shared admission numbers with conflicting student identities (review before backfill):");
  console.table(identityConflicts.rows);
  await client.query("ROLLBACK");
} finally {
  await client.end();
}
