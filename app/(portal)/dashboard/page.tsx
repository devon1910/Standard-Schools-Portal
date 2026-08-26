import Link from "next/link";
import { BookOpenCheck, CircleDollarSign, GraduationCap, Users } from "lucide-react";
import SetupChecklist from "@/components/setup-checklist";
import { requireUser } from "@/lib/auth";
import { getCurrentSessionId } from "@/lib/current-session";
import { db } from "@/lib/db";
import { money } from "@/lib/format";

export default async function DashboardPage() {
  const user = await requireUser();
  const sessions = await db.legacySession.findMany({ where: { schoolId: user.schoolId }, orderBy: { id: "desc" }, select: { id: true, name: true } });
  const sessionId = await getCurrentSessionId(user.schoolId, sessions);
  const currentSession = sessions.find((session) => session.id === sessionId);
  const [classes, questions, enrollments, resultsEntered, subjectCount] = await Promise.all([
    db.legacyClass.count({ where: { schoolId: user.schoolId, sessionId: sessionId ?? -1, archivedAt: null } }),
    db.legacyQuestion.count({ where: { schoolId: user.schoolId, archivedAt: null } }),
    db.enrollment.findMany({ where: { schoolId: user.schoolId, sessionId: sessionId ?? -1, active: true }, select: { firstTermFeePaid: true, firstTermBalance: true } }),
    db.resultScore.count({ where: { schoolId: user.schoolId, enrollment: { sessionId: sessionId ?? -1 } } }),
    db.legacySubject.count({ where: { schoolId: user.schoolId, archivedAt: null } }),
  ]);
  const paid = enrollments.filter((item) => item.firstTermFeePaid).length;
  const outstanding = enrollments.reduce((sum, item) => sum + Number(item.firstTermBalance), 0);
  const stats = [
    { label: "Students this session", value: enrollments.length.toLocaleString(), Icon: Users },
    { label: `${currentSession?.name ?? "Current"} classes`, value: classes.toLocaleString(), Icon: GraduationCap },
    { label: "First-term fees paid", value: `${paid}/${enrollments.length}`, Icon: CircleDollarSign },
    { label: "Scores entered", value: resultsEntered.toLocaleString(), Icon: BookOpenCheck },
  ];

  return <><header className="page-header"><div><h2>Good day, {user.name.split(" ")[0]}</h2><p>Here is the current picture of {currentSession?.name ?? "your school"}. Use the shortcuts to continue common work.</p></div><div className="header-actions"><Link className="button button-primary" href="/students">Add a student</Link></div></header><SetupChecklist sessionName={currentSession?.name} hasSession={Boolean(currentSession)} classCount={classes} subjectCount={subjectCount} studentCount={enrollments.length} /><section className="grid stats-grid dashboard-stats">{stats.map(({ label, value, Icon }) => <article className="card stat" key={label}><span className="stat-icon"><Icon size={20} /></span><strong>{value}</strong><span>{label}</span></article>)}</section><section className="grid two-column" style={{ marginTop: 20 }}><article className="card card-pad"><h3>Quick actions</h3><div className="grid three-column"><Link className="button button-secondary" href="/promotion">Start new session</Link><Link className="button button-secondary" href="/results">Enter scores</Link><Link className="button button-secondary" href="/reports">Prepare reports</Link><Link className="button button-secondary" href="/questions">Upload question</Link><Link className="button button-secondary" href="/academics">Manage classes</Link><Link className="button button-secondary" href="/students">Find a student</Link></div></article><article className="card card-pad"><h3>Fee overview</h3><p className="muted small">First term | {currentSession?.name ?? "No session"}</p><strong style={{ fontSize: "1.65rem" }}>{money.format(outstanding)}</strong><p className="muted small">Recorded outstanding balance</p><div className="fee-progress"><div style={{ width: enrollments.length ? `${(paid / enrollments.length) * 100}%` : "0%" }} /></div><p className="small">{paid} paid | {Math.max(0, enrollments.length - paid)} unpaid</p></article></section><section className="card card-pad" style={{ marginTop: 20 }}><h3>Question bank</h3><p className="muted">{questions.toLocaleString()} active question files are available. Questions stay searchable by session, term, class, subject and assessment type.</p><Link className="button button-quiet" href="/questions">Open question bank</Link></section></>;
}
