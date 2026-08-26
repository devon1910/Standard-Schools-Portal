import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { cloneSessionClasses } from "@/app/actions/admin";
import PromotionWizard from "@/components/promotion-wizard";
import SubmitButton from "@/components/submit-button";
import { EmptyState } from "@/components/empty-state";

export default async function PromotionPage({ searchParams }: { searchParams: Promise<{ source?: string; target?: string }> }) {
  const user = await requireOwner();
  const params = await searchParams;
  const sessions = await db.legacySession.findMany({ where: { schoolId: user.schoolId }, orderBy: { id: "desc" } });
  const sourceSessionId = Number(params.source);
  const targetSessionId = Number(params.target);
  if ((!sourceSessionId && params.source) || (!targetSessionId && params.target)) redirect("/promotion");

  if (!sessions.length) return <><header className="page-header"><div><h2>Start a new session</h2><p>Create the first academic session before setting up continuity.</p></div></header><section className="card"><EmptyState title="No academic session yet" description="Create the school's first session, then return here when you are ready to copy students into the next one." actionHref="/academics" actionLabel="Create a session" /></section></>;

  if (!sourceSessionId || !targetSessionId) {
    return <><header className="page-header"><div><h2>Start a new session</h2><p>Clone the class structure, then review every student before creating next session’s enrollments.</p></div></header><section className="card card-pad" style={{ maxWidth: 720 }}><h3>1. Create the session structure</h3><form action={cloneSessionClasses} className="form-grid"><div className="field"><label>Copy classes from</label><select className="select" name="sourceSessionId" required>{sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}</select></div><div className="field"><label>New session name</label><input className="input" name="targetSessionName" placeholder="2026/2027" required /></div><div className="field full"><div className="notice info">Class names and categories are copied. You can change teachers later, and no student is moved until you confirm the review.</div></div><SubmitButton className="button button-primary field full" pendingLabel="Preparing session...">Create and review students</SubmitButton></form></section></>;
  }

  const [sourceSession, targetSession, sourceClasses, targetClasses] = await Promise.all([
    db.legacySession.findFirst({ where: { id: sourceSessionId, schoolId: user.schoolId } }),
    db.legacySession.findFirst({ where: { id: targetSessionId, schoolId: user.schoolId } }),
    db.legacyClass.findMany({ where: { sessionId: sourceSessionId, schoolId: user.schoolId, archivedAt: null }, include: { enrollments: { where: { active: true }, include: { student: true }, orderBy: { student: { name: "asc" } } } }, orderBy: { name: "asc" } }),
    db.legacyClass.findMany({ where: { sessionId: targetSessionId, schoolId: user.schoolId, archivedAt: null }, orderBy: { name: "asc" } }),
  ]);
  if (!sourceSession || !targetSession) redirect("/promotion");
  const serialized = sourceClasses.map((item) => ({ id: item.id, name: item.name, students: item.enrollments.map((enrollment) => ({ enrollmentId: enrollment.id.toString(), name: enrollment.student.name, admissionNumber: enrollment.student.admissionNumber })) }));
  return <><header className="page-header"><div><h2>Review promotion</h2><p>{sourceSession.name} → {targetSession.name}. All students start selected for promotion.</p></div></header><PromotionWizard sourceSessionId={sourceSession.id} targetSessionId={targetSession.id} sourceClasses={serialized} targetClasses={targetClasses.map(({ id, name }) => ({ id, name }))} /></>;
}
