import type { Prisma } from "@prisma/client";
import { formatStudentId } from "./student-id";

export class StudentIdSetupRequired extends Error {
  constructor() { super("Ask the school owner to set the student ID format in Settings before adding students."); }
}

export async function allocateStudentIds(tx: Prisma.TransactionClient, schoolId: number, count: number) {
  // Serialize allocations for this school. The caller creates the profiles in the same transaction.
  const [school] = await tx.$queryRaw<{ studentIdPrefix: string | null; studentIdDigits: number; nextStudentNumber: number }[]>`
    SELECT "studentIdPrefix", "studentIdDigits", "nextStudentNumber" FROM "School" WHERE "id" = ${schoolId} FOR UPDATE
  `;
  if (!school?.studentIdPrefix) throw new StudentIdSetupRequired();
  const existing = await tx.studentProfile.findMany({
    where: { schoolId, OR: [
      { studentId: { startsWith: school.studentIdPrefix, mode: "insensitive" } },
      { admissionNumber: { startsWith: school.studentIdPrefix, mode: "insensitive" } },
    ] },
    select: { studentId: true, admissionNumber: true },
  });
  const used = new Set(existing.flatMap((student) => [student.studentId?.toUpperCase(), student.admissionNumber?.toUpperCase()].filter(Boolean)));
  let next = school.nextStudentNumber;
  const ids: string[] = [];
  while (ids.length < count) {
    if (next >= 2_147_483_647) throw new Error("The student ID sequence has reached its limit.");
    const id = formatStudentId(school.studentIdPrefix, school.studentIdDigits, next++);
    if (!used.has(id)) ids.push(id);
  }
  await tx.school.update({ where: { id: schoolId }, data: { nextStudentNumber: next } });
  return ids;
}
