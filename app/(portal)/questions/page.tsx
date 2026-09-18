import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import QuestionUploadForm from "@/components/question-upload-form";
import QuestionActions from "@/components/question-actions";
import { getCurrentSessionId } from "@/lib/current-session";
import { EmptyTableRow } from "@/components/empty-state";

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ session?: string; term?: string; class?: string; subject?: string; type?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const [sessions, terms, classes, subjects] = await Promise.all([
    db.legacySession.findMany({ where: { schoolId: user.schoolId }, orderBy: { id: "desc" } }),
    db.legacyTerm.findMany({ where: { schoolId: user.schoolId }, orderBy: { id: "asc" } }),
    db.legacyClass.findMany({ where: { schoolId: user.schoolId }, orderBy: { name: "asc" } }),
    db.legacySubject.findMany({ where: { schoolId: user.schoolId }, orderBy: { name: "asc" } }),
  ]);
  const selectedId = (value: string | undefined, options: { id: number }[]) => {
    const id = Number(value);
    return id && options.some((option) => option.id === id) ? id : undefined;
  };
  const sessionId = selectedId(params.session, sessions);
  const termId = selectedId(params.term, terms);
  const classId = selectedId(params.class, classes);
  const subjectId = selectedId(params.subject, subjects);
  const type = params.type === "CA" || params.type === "Exam" ? params.type : undefined;
  const uploadSessionId = await getCurrentSessionId(user.schoolId, sessions);
  const questions = await db.legacyQuestion.findMany({ where: { schoolId: user.schoolId, archivedAt: null, ...(sessionId ? { sessionId } : {}), ...(termId ? { termId } : {}), ...(classId ? { classId } : {}), ...(subjectId ? { subjectId } : {}), ...(type ? { type } : {}) }, orderBy: { id: "desc" }, take: 50 });
  const uploadClasses = classes.filter((item) => item.archivedAt === null);
  const uploadSubjects = subjects.filter((item) => item.archivedAt === null);

  return <><header className="page-header"><div><h2>Question bank</h2><p>Upload and retrieve assessment files by session, term, class, subject and type.</p></div><details className="panel"><summary>Upload question</summary><div className="panel-body" style={{ width: "min(700px, 80vw)" }}><QuestionUploadForm defaultSessionId={uploadSessionId} sessions={sessions.map(({ id, name }) => ({ id, name }))} terms={terms.map(({ id, name }) => ({ id, name }))} classes={uploadClasses.map(({ id, name, sessionId }) => ({ id, name, sessionId }))} subjects={uploadSubjects.map(({ id, name, classTypeId }) => ({ id, name, classTypeId }))} /></div></details></header><form className="filter-bar card"><div className="field"><label>Session</label><select className="select" name="session" defaultValue={sessionId ?? ""}><option value="">All sessions</option>{sessions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div><div className="field"><label>Term</label><select className="select" name="term" defaultValue={termId ?? ""}><option value="">All terms</option>{terms.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div><div className="field"><label>Class</label><select className="select" name="class" defaultValue={classId ?? ""}><option value="">All classes</option>{classes.filter((item) => !sessionId || item.sessionId === sessionId).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div><div className="field"><label>Subject</label><select className="select" name="subject" defaultValue={subjectId ?? ""}><option value="">All subjects</option>{subjects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div><div className="field"><label>Type</label><select className="select" name="type" defaultValue={type ?? ""}><option value="">All types</option><option>CA</option><option>Exam</option></select></div><button className="button button-secondary">Apply</button></form><section className="card"><div className="table-wrap"><table className="table"><thead><tr><th>Class</th><th>Subject</th><th>Term</th><th>Type</th><th>File</th><th>Actions</th></tr></thead><tbody>{questions.map((item) => <tr key={item.id}><td>{classes.find((value) => value.id === item.classId)?.name ?? "-"}</td><td>{subjects.find((value) => value.id === item.subjectId)?.name ?? "-"}</td><td>{terms.find((value) => value.id === item.termId)?.name ?? "-"}</td><td><span className="badge neutral">{item.type}</span></td><td><a className="button button-quiet" href={item.questionUrl} target="_blank" rel="noreferrer">Open file</a></td><td><QuestionActions id={item.id} /></td></tr>)}{!questions.length && <EmptyTableRow colSpan={6} title="No question files found" description="Adjust the filters or upload the first question file for this selection." actionHref="/questions" actionLabel="Clear filters" />}</tbody></table></div></section></>;
}
