import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFamilyUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { displayStudentId } from "@/lib/student-id";
import { formatDate } from "@/lib/format";
import { LogoutButton } from "@/components/portal-nav";

export default async function FamilyReportsPage() {
  const user = await requireFamilyUser();
  const studentId = BigInt(user.studentProfileId);
  const [student, reports, sessions, terms] = await Promise.all([
    db.studentProfile.findFirst({ where: { id: studentId, schoolId: user.schoolId } }),
    db.termReport.findMany({
      where: { schoolId: user.schoolId, status: "PUBLISHED", enrollment: { schoolId: user.schoolId, studentId } },
      include: { enrollment: { select: { sessionId: true, class: { select: { name: true } } } } },
      orderBy: [{ enrollment: { sessionId: "desc" } }, { termId: "desc" }],
    }),
    db.legacySession.findMany({ where: { schoolId: user.schoolId }, select: { id: true, name: true } }),
    db.legacyTerm.findMany({ where: { schoolId: user.schoolId }, select: { id: true, name: true } }),
  ]);
  if (!student) notFound();
  const sessionNames = new Map(sessions.map((item) => [item.id, item.name]));
  const termNames = new Map(terms.map((item) => [item.id, item.name]));
  return <main className="family-shell">
    <header className="family-header"><div><span className="eyebrow">Student and guardian portal</span><h1>{user.schoolName}</h1></div><div className="header-actions"><Link className="button button-secondary" href="/family/change-password">Change password</Link><LogoutButton loginPath="/family/login" /></div></header>
    <section className="card card-pad"><h2>{student.name}</h2><p className="small muted">Student ID: {displayStudentId(student)}</p><h3>Published report cards</h3><p className="small muted">Open a report to view it, print it, or save it as a PDF. Your school controls when reports become available.</p>
      <div className="table-wrap"><table className="table"><thead><tr><th>Session</th><th>Term</th><th>Class</th><th>Published</th><th>Report card</th></tr></thead><tbody>
        {reports.map((report) => <tr key={report.id.toString()}><td>{sessionNames.get(report.enrollment.sessionId) ?? "-"}</td><td>{termNames.get(report.termId) ?? "-"}</td><td>{report.enrollment.class.name}</td><td>{formatDate(report.publishedAt)}</td><td><Link className="button button-secondary" href={`/family/reports/${report.id}`}>Open report</Link></td></tr>)}
        {!reports.length && <tr><td colSpan={5} className="empty">No report cards are available yet. Check again after your school publishes them.</td></tr>}
      </tbody></table></div>
    </section>
  </main>;
}
