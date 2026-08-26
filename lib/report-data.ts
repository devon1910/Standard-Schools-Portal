import { db } from "@/lib/db";
import { competitionRanks, gradeFor, ordinal, remarkFor, scoreTotal } from "@/lib/result-calculations";

export async function getClassReportData(schoolId: number, sessionId: number, termId: number, classId: number) {
  const [school, session, term, classInfo, setup, classSubjects, enrollments] = await Promise.all([
    db.school.findUnique({ where: { id: schoolId } }),
    db.legacySession.findFirst({ where: { id: sessionId, schoolId } }),
    db.legacyTerm.findFirst({ where: { id: termId, schoolId } }),
    db.legacyClass.findFirst({ where: { id: classId, schoolId, sessionId } }),
    db.termSetup.findUnique({ where: { schoolId_sessionId_termId: { schoolId, sessionId, termId } } }),
    db.classSubject.findMany({ where: { schoolId, classId }, include: { subject: true }, orderBy: { subject: { name: "asc" } } }),
    db.enrollment.findMany({ where: { schoolId, sessionId, classId, active: true }, include: { student: true, scores: { where: { termId } }, reports: { where: { termId } } }, orderBy: { student: { name: "asc" } } }),
  ]);
  if (!school || !session || !term || !classInfo) return null;

  const subjectRanks = new Map<number, Map<string, number>>();
  for (const { subjectId } of classSubjects) {
    const values = enrollments.flatMap((enrollment) => {
      const score = enrollment.scores.find((item) => item.subjectId === subjectId);
      return score?.firstTest !== null && score?.secondTest !== null && score?.exam !== null && score ? [{ id: enrollment.id.toString(), value: scoreTotal(score.firstTest!, score.secondTest!, score.exam!) }] : [];
    });
    subjectRanks.set(subjectId, competitionRanks(values));
  }

  const summaries = enrollments.map((enrollment) => {
    const rows = classSubjects.map(({ subject }) => {
      const score = enrollment.scores.find((item) => item.subjectId === subject.id);
      const complete = Boolean(score && score.firstTest !== null && score.secondTest !== null && score.exam !== null);
      const total = complete ? scoreTotal(score!.firstTest!, score!.secondTest!, score!.exam!) : null;
      const rank = total === null ? null : subjectRanks.get(subject.id)?.get(enrollment.id.toString()) ?? null;
      return { subjectId: subject.id, subject: subject.name, firstTest: score?.firstTest ?? null, secondTest: score?.secondTest ?? null, exam: score?.exam ?? null, total, grade: total === null ? "-" : gradeFor(total), remark: total === null ? "Incomplete" : remarkFor(total), position: rank ? ordinal(rank) : "-" };
    });
    const completed = rows.filter((row) => row.total !== null);
    const total = completed.reduce((sum, row) => sum + (row.total ?? 0), 0);
    const average = completed.length ? total / completed.length : 0;
    return { enrollment, report: enrollment.reports[0] ?? null, rows, total, average, complete: completed.length === classSubjects.length && classSubjects.length > 0 };
  });
  const overallRanks = competitionRanks(summaries.filter((item) => item.complete).map((item) => ({ id: item.enrollment.id.toString(), value: item.average })));
  const averages = summaries.filter((item) => item.complete).map((item) => item.average);

  return {
    school, session, term, classInfo, setup, classSubjects,
    classSize: enrollments.length,
    highestAverage: averages.length ? Math.max(...averages) : 0,
    lowestAverage: averages.length ? Math.min(...averages) : 0,
    students: summaries.map((item) => ({ ...item, position: overallRanks.get(item.enrollment.id.toString()) ?? null })),
  };
}

export type ClassReportData = NonNullable<Awaited<ReturnType<typeof getClassReportData>>>;
