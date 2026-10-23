import { db } from "../lib/db";
import { pathToFileURL } from "node:url";

function normalizedAdmission(value: string) {
  const normalized = value.trim().toUpperCase();
  return normalized || null;
}

export async function backfillLegacyStudents() {
  const legacy = await db.legacyStudent.findMany({
    orderBy: [{ dateModified: "asc" }, { dateCreated: "asc" }, { id: "asc" }],
  });

  const classes = new Map((await db.legacyClass.findMany({ select: { id: true, schoolId: true, sessionId: true } })).map((item) => [item.id, item]));
  const identities = new Map<string, (typeof legacy)[number]>();
  // Validate all rows before writing. Admission numbers alone do not prove identity.
  for (const row of legacy) {
    const classInfo = classes.get(row.classId);
    if (!classInfo || classInfo.schoolId !== row.schoolId || classInfo.sessionId !== row.sessionId) {
      throw new Error(`Legacy student ${row.id}: class ${row.classId} does not belong to school ${row.schoolId} and session ${row.sessionId}. Review the class link before running the backfill.`);
    }
    const admission = normalizedAdmission(row.admissionNumber);
    if (!admission) continue;
    const key = `${row.schoolId}:${admission}`;
    const previous = identities.get(key);
    if (previous && (previous.name.trim().replace(/\s+/g, " ").toUpperCase() !== row.name.trim().replace(/\s+/g, " ").toUpperCase() || previous.dob.getTime() !== row.dob.getTime())) {
      throw new Error(`Legacy students ${previous.id} and ${row.id} share an admission number but have different names or dates of birth. Resolve their identities before running the backfill.`);
    }
    identities.set(key, row);
  }

  const collisions = new Map<string, typeof legacy>();
  for (const row of legacy) {
    const admission = normalizedAdmission(row.admissionNumber);
    if (!admission) continue;
    const key = `${row.schoolId}:${admission}:${row.sessionId}`;
    const rows = collisions.get(key) ?? [];
    rows.push(row);
    collisions.set(key, rows);
  }
  const duplicateGroups = [...collisions.values()].filter((rows) => rows.length > 1);
  // A null modification date sorts last in SQL, even when that row is older.
  for (const rows of duplicateGroups) {
    rows.sort((a, b) => (a.dateModified ?? a.dateCreated).getTime() - (b.dateModified ?? b.dateCreated).getTime()
      || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
  const supersededIds = new Set(
    duplicateGroups.flatMap((rows) => rows.slice(0, -1).map((row) => row.id)),
  );
  if (duplicateGroups.length) {
    console.warn(`Found ${duplicateGroups.length} duplicate admission groups; newest legacy rows will be used for enrollment.`);
  }

  for (const row of legacy) {
    if (supersededIds.has(row.id)) continue;
    const alreadyImported = await db.enrollment.findUnique({
      where: { legacyStudentId: row.id },
      select: { id: true },
    });
    if (alreadyImported) continue;

    const admissionNumber = normalizedAdmission(row.admissionNumber);
    const existing = admissionNumber
      ? await db.studentProfile.findUnique({
          where: { schoolId_admissionNumber: { schoolId: row.schoolId, admissionNumber } },
        })
      : null;

    const profileData = {
      schoolId: row.schoolId,
      name: row.name.trim(),
      admissionNumber,
      gender: row.gender || null,
      dob: row.dob,
      tribe: row.tribe || null,
      stateOfOrigin: row.stateOfOrigin || null,
      lgaOfOrigin: row.lgaOfOrigin || null,
      classAtAdmission: row.classAtAdmission || null,
      dateOfAdmission: row.dateOfAdmission,
      yearOfAdmission: row.yearOfAdmission || null,
      parentName: row.parentName || null,
      parentAddress: row.parentAddress || null,
      parentPhone: row.parentPhone || null,
      parentReligion: row.parentReligion || null,
    };
    const profile = existing
      ? await db.studentProfile.update({ where: { id: existing.id }, data: profileData })
      : await db.studentProfile.create({ data: profileData });

    await db.enrollment.upsert({
      where: { legacyStudentId: row.id },
      update: {},
      create: {
        schoolId: row.schoolId,
        studentId: profile.id,
        sessionId: row.sessionId,
        classId: row.classId,
        legacyStudentId: row.id,
        firstTermFeePaid: row.isFirstTermFeePaid,
        firstTermBalance: row.firstTermBalance,
        secondTermFeePaid: row.isSecondTermFeePaid,
        secondTermBalance: row.secondTermBalance,
        thirdTermFeePaid: row.isThirdTermFeePaid,
        thirdTermBalance: row.thirdTermBalance,
      },
    });
  }

  const [profiles, enrollments] = await Promise.all([
    db.studentProfile.count(),
    db.enrollment.count(),
  ]);
  console.log({ legacyRows: legacy.length, skippedDuplicates: supersededIds.size, profiles, enrollments });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  backfillLegacyStudents().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }).finally(() => db.$disconnect());
}
