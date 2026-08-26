import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import ClassSubjectPicker from "@/components/class-subject-picker";
import ScoreSheet from "@/components/score-sheet";
import { getCurrentSessionId } from "@/lib/current-session";
import { EmptyState } from "@/components/empty-state";

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ session?: string; term?: string; class?: string; subject?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const [sessions, terms] = await Promise.all([
    db.legacySession.findMany({ where: { schoolId: user.schoolId }, orderBy: { id: "desc" } }),
    db.legacyTerm.findMany({ where: { schoolId: user.schoolId }, orderBy: { id: "asc" } }),
  ]);
  const sessionId = await getCurrentSessionId(user.schoolId, sessions, params.session);
  const termId = Number(params.term) || terms[0]?.id;
  const classes = sessionId ? await db.legacyClass.findMany({ where: { schoolId: user.schoolId, sessionId, archivedAt: null }, orderBy: { name: "asc" } }) : [];
  const classId = Number(params.class) || classes[0]?.id;
  const selectedClass = classes.find((item) => item.id === classId);
  const [availableSubjects, configured] = selectedClass ? await Promise.all([
    db.legacySubject.findMany({ where: { schoolId: user.schoolId, classTypeId: selectedClass.classTypeId, archivedAt: null }, orderBy: { name: "asc" } }),
    db.classSubject.findMany({ where: { schoolId: user.schoolId, classId: selectedClass.id }, include: { subject: true }, orderBy: { subject: { name: "asc" } } }),
  ]) : [[], []];
  const subjectId = Number(params.subject) || configured[0]?.subjectId;
  const enrollments = classId ? await db.enrollment.findMany({ where: { schoolId: user.schoolId, sessionId, classId, active: true }, include: { student: true, scores: { where: { termId, subjectId: subjectId ?? -1 } } }, orderBy: { student: { name: "asc" } } }) : [];

  return <><header className="page-header"><div><h2>Score sheets</h2><p>Enter First Test (20), Second Test (20), and Exam (60) for the full class.</p></div></header><form className="filter-bar card"><div className="field"><label>Session</label><select className="select" name="session" defaultValue={sessionId}>{sessions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field"><label>Term</label><select className="select" name="term" defaultValue={termId}>{terms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field"><label>Class</label><select className="select" name="class" defaultValue={classId}>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field"><label>Subject</label><select className="select" name="subject" defaultValue={subjectId}>{configured.map((item) => <option key={item.subjectId} value={item.subjectId}>{item.subject.name}</option>)}</select></div><button className="button button-secondary">Open sheet</button></form>{selectedClass && <details className="panel" style={{ marginBottom: 18 }}><summary>Configure subjects for {selectedClass.name}</summary><div className="panel-body"><ClassSubjectPicker classId={selectedClass.id} canEdit={user.role === "OWNER"} subjects={availableSubjects.map(({ id, name }) => ({ id, name }))} selected={configured.map((item) => item.subjectId)} /></div></details>}{configured.length && subjectId ? <ScoreSheet classId={classId!} termId={termId!} subjectId={subjectId} subjectName={configured.find((item) => item.subjectId === subjectId)?.subject.name ?? "Subject"} students={enrollments.map((item) => ({ enrollmentId: item.id.toString(), name: item.student.name, admissionNumber: item.student.admissionNumber, firstTest: item.scores[0]?.firstTest ?? null, secondTest: item.scores[0]?.secondTest ?? null, exam: item.scores[0]?.exam ?? null }))} /> : <section className="card"><EmptyState title="No score sheet is ready" description="Choose a class and configure at least one subject before entering scores." actionHref="/academics" actionLabel="Manage subjects" /></section>}</>;
}
