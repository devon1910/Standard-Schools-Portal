import { pathToFileURL } from "node:url";
import type { PrismaClient } from "@prisma/client";
import { allocateStudentIds } from "../../lib/allocate-student-ids";
import { normalizedClassName } from "../../lib/promotion";

export const recoveryLegacyIds = [23, 57, 58, 65, 67, 112, 115, 120, 197, 244, 285, 333, 334, 408, 409, 416, 418, 425, 426, 427, 428, 432, 433, 440, 441, 492].map(BigInt);

// The owner approved treating these 26 legacy rows as separate students.
// Shared admission numbers stay in Students, linked by Enrollment.legacyStudentId.
export async function recoverSchool1Session3Students(database: PrismaClient) {
  return database.$transaction(async (tx) => {
    const session = await tx.legacySession.findFirst({ where: { id: 3, schoolId: 1, name: "2025/2026" } });
    if (!session) throw new Error("The approved school/session could not be found.");
    const rows = await tx.legacyStudent.findMany({ where: { id: { in: recoveryLegacyIds }, schoolId: 1, sessionId: 3 }, orderBy: { id: "asc" } });
    if (rows.length !== recoveryLegacyIds.length) throw new Error("The approved 26 legacy rows have changed. Audit them before recovery.");
    const classes = await tx.legacyClass.findMany({ where: { schoolId: 1 } });
    const existing = await tx.enrollment.findMany({ where: { legacyStudentId: { in: recoveryLegacyIds } }, include: { student: true } });
    const pending = [];
    for (const row of rows) {
      const source = classes.find((item) => item.id === row.classId);
      const targets = source ? classes.filter((item) => item.sessionId === 3 && item.archivedAt === null && item.classTypeId === source.classTypeId && normalizedClassName(item.name) === normalizedClassName(source.name)) : [];
      if (targets.length !== 1) throw new Error(`Legacy row ${row.id} needs one matching class and category in session 3.`);
      const linked = existing.find((item) => item.legacyStudentId === row.id);
      if (linked) {
        if (linked.schoolId !== 1 || linked.sessionId !== 3 || linked.classId !== targets[0].id || linked.student.schoolId !== 1) throw new Error(`Legacy row ${row.id} already has an inconsistent enrollment. No recovery was applied.`);
        continue;
      }
      pending.push({ row, classId: targets[0].id, admission: { admissionNumber: row.admissionNumber, dateOfAdmission: row.dateOfAdmission, yearOfAdmission: row.yearOfAdmission, classAtAdmission: row.classAtAdmission, className: targets[0].name, sessionName: session.name } });
    }
    if (!pending.length) return { created: 0, alreadyLinked: rows.length, students: [] };
    const ids = await allocateStudentIds(tx, 1, pending.map((item) => item.admission));
    const students = [];
    for (const [index, { row, classId }] of pending.entries()) {
      const profile = await tx.studentProfile.create({ data: {
        schoolId: 1, studentId: ids[index], admissionNumber: null, name: row.name.trim(),
        gender: row.gender || null, dob: row.dob, tribe: row.tribe || null,
        stateOfOrigin: row.stateOfOrigin || null, lgaOfOrigin: row.lgaOfOrigin || null,
        classAtAdmission: row.classAtAdmission || null, dateOfAdmission: row.dateOfAdmission,
        yearOfAdmission: row.yearOfAdmission || null, parentName: row.parentName || null,
        parentAddress: row.parentAddress || null, parentPhone: row.parentPhone || null,
        parentReligion: row.parentReligion || null,
        enrollments: { create: {
          schoolId: 1, sessionId: 3, classId, legacyStudentId: row.id,
          firstTermFeePaid: row.isFirstTermFeePaid, firstTermBalance: row.firstTermBalance,
          secondTermFeePaid: row.isSecondTermFeePaid, secondTermBalance: row.secondTermBalance,
          thirdTermFeePaid: row.isThirdTermFeePaid, thirdTermBalance: row.thirdTermBalance,
        } },
      }, include: { enrollments: { where: { sessionId: 3 }, select: { id: true, classId: true } } } });
      students.push({ legacyId: row.id.toString(), profileId: profile.id.toString(), enrollmentId: profile.enrollments[0].id.toString(), studentId: profile.studentId, classId });
    }
    return { created: students.length, alreadyLinked: rows.length - students.length, students };
  }, { timeout: 60_000 });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.slice(2).join(" ") !== "--apply") throw new Error("Use --apply only after backup and approval. Run the enrollment audit for a read-only preview.");
  const { db } = await import("../../lib/db");
  try { console.log(JSON.stringify(await recoverSchool1Session3Students(db))); }
  finally { await db.$disconnect(); }
}
