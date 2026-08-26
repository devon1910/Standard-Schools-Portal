import { db } from "../lib/db";

function normalizedAdmission(value: string) {
  const normalized = value.trim().toUpperCase();
  return normalized || null;
}

async function main() {
  const legacy = await db.legacyStudent.findMany({
    orderBy: [{ dateModified: "asc" }, { dateCreated: "asc" }, { id: "asc" }],
  });

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

main().finally(() => db.$disconnect());
