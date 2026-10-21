import { db } from "@/lib/db";
import { getClassReportData } from "@/lib/report-data";

export async function getFamilyReport(schoolId: number, studentProfileId: bigint, reportId: bigint) {
  const report = await db.termReport.findFirst({
    where: { id: reportId, schoolId, status: "PUBLISHED", enrollment: { schoolId, studentId: studentProfileId } },
    include: { enrollment: { select: { id: true, sessionId: true, classId: true } } },
  });
  if (!report) return null;
  const data = await getClassReportData(schoolId, report.enrollment.sessionId, report.termId, report.enrollment.classId);
  if (!data) return null;
  const student = data.students.find((item) => item.enrollment.studentId === studentProfileId && item.enrollment.id === report.enrollment.id);
  if (!student || student.report?.id !== report.id || student.report.status !== "PUBLISHED") return null;
  return { data, student };
}
