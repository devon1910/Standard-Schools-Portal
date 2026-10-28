import type { Prisma } from "@prisma/client";
import { formatAdmissionStudentId, formatStudentId, parseAdmissionStudentId, studentAdmission, type StudentAdmissionInput } from "./student-id";

export async function allocateStudentIds(tx: Prisma.TransactionClient, schoolId: number, admissions: StudentAdmissionInput[]) {
  // Serialize allocations for this school. The caller creates the profiles in the same transaction.
  const [school] = await tx.$queryRaw<{ studentIdPrefix: string | null; studentIdDigits: number; nextStudentNumber: number }[]>`
    SELECT "studentIdPrefix", "studentIdDigits", "nextStudentNumber" FROM "School" WHERE "id" = ${schoolId} FOR UPDATE
  `;
  if (!school) throw new Error("School not found.");
  const existing = await tx.studentProfile.findMany({
    where: { schoolId },
    select: { studentId: true, admissionNumber: true },
  });
  const legacy = await tx.legacyStudent.findMany({ where: { schoolId }, select: { admissionNumber: true } });
  const identifiers = [...existing.flatMap((student) => [student.studentId, student.admissionNumber]), ...legacy.map((student) => student.admissionNumber)];
  const used = new Set(identifiers.filter((value): value is string => Boolean(value)).map((value) => value.trim().toUpperCase()));
  if (!school.studentIdPrefix) {
    const highest = new Map<string, number>();
    for (const value of identifiers) {
      const parsed = parseAdmissionStudentId(value);
      if (parsed) {
        const key = `${parsed.year}/${parsed.classCode}`;
        highest.set(key, Math.max(highest.get(key) ?? 0, parsed.sequence));
      }
    }
    // Keep the existing school counter as a floor so deleted generated IDs are not reused.
    let nextNumber = school.nextStudentNumber;
    const ids = admissions.map(studentAdmission).map((admission) => {
      const key = `${admission.year}/${admission.classCode}`;
      let next = Math.max((highest.get(key) ?? 0) + 1, nextNumber);
      while (used.has(formatAdmissionStudentId(admission, next))) next++;
      if (next >= 2_147_483_647) throw new Error("The student ID sequence has reached its limit.");
      const id = formatAdmissionStudentId(admission, next);
      highest.set(key, next);
      used.add(id);
      nextNumber = next + 1;
      return id;
    });
    await tx.school.update({ where: { id: schoolId }, data: { nextStudentNumber: nextNumber } });
    return ids;
  }
  let next = school.nextStudentNumber;
  const ids: string[] = [];
  while (ids.length < admissions.length) {
    if (next >= 2_147_483_647) throw new Error("The student ID sequence has reached its limit.");
    const id = formatStudentId(school.studentIdPrefix, school.studentIdDigits, next++);
    if (!used.has(id)) ids.push(id);
  }
  await tx.school.update({ where: { id: schoolId }, data: { nextStudentNumber: next } });
  return ids;
}
