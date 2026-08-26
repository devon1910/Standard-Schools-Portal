import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getClassReportData } from "@/lib/report-data";
import ReportCard from "@/components/report-card";
import PrintButton from "@/components/print-button";

export default async function PrintReportsPage({ searchParams }: { searchParams: Promise<{ session?: string; term?: string; class?: string; student?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const sessionId = Number(params.session); const termId = Number(params.term); const classId = Number(params.class);
  if (!sessionId || !termId || !classId) notFound();
  const data = await getClassReportData(user.schoolId, sessionId, termId, classId);
  if (!data) notFound();
  const students = params.student ? data.students.filter((item) => item.enrollment.id.toString() === params.student) : data.students;
  return <><div className="no-print" style={{ maxWidth: 900, margin: "0 auto 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><strong>Report preview</strong><p className="small muted">{students.length} report{students.length === 1 ? "" : "s"}. Drafts display a watermark.</p></div><PrintButton /></div><main className="print-stack">{students.map((student) => <ReportCard data={data} student={student} key={student.enrollment.id.toString()} />)}{!students.length && <div className="empty">No report found.</div>}</main></>;
}
