import Link from "next/link";
import { Plus, Search, Upload } from "lucide-react";
import { updateFees } from "@/app/actions/admin";
import StudentCreateForm from "@/components/student-create-form";
import SubmitButton from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { getCurrentSessionId } from "@/lib/current-session";
import { EmptyTableRow } from "@/components/empty-state";
import StudentImportForm from "@/components/student-import-form";

const PAGE_SIZE = 20;

type StudentsSearchParams = Promise<{
  q?: string;
  session?: string;
  class?: string;
  page?: string;
  error?: string;
}>;

export default async function StudentsPage({ searchParams }: { searchParams: StudentsSearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const [sessions, allClasses] = await Promise.all([
    db.legacySession.findMany({
      where: { schoolId: user.schoolId },
      orderBy: { id: "desc" },
      select: { id: true, name: true },
    }),
    db.legacyClass.findMany({
      where: { schoolId: user.schoolId, archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sessionId: true },
    }),
  ]);
  const sessionId = await getCurrentSessionId(user.schoolId, sessions, params.session);
  const classes = allClasses.filter((item) => item.sessionId === sessionId);
  const classId = Number(params.class) || undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const query = params.q?.trim() ?? "";
  const where = {
    schoolId: user.schoolId,
    sessionId: sessionId ?? -1,
    active: true,
    ...(classId ? { classId } : {}),
    ...(query
      ? {
          student: {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { admissionNumber: { contains: query, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };
  const [enrollments, count] = await Promise.all([
    db.enrollment.findMany({
      where,
      include: { student: true, class: true },
      orderBy: { student: { name: "asc" } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.enrollment.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const errorMap: Record<string, string> = {
    "admission-exists": "That admission number is already assigned to another student.",
    "invalid-class": "Choose a valid class in the selected session.",
  };

  return (
    <>
      <header className="page-header">
        <div>
          <h2>Students</h2>
          <p>One permanent profile per student, with a clear enrollment history for each academic session.</p>
        </div>
        <div className="header-actions">
          <details className="panel">
            <summary><Upload size={15} style={{ display: "inline", marginRight: 7 }} />Import students</summary>
            <div className="panel-body"><StudentImportForm sessions={sessions} classes={allClasses} defaultSessionId={sessionId} /></div>
          </details>
          <details className="panel">
            <summary><Plus size={15} style={{ display: "inline", marginRight: 7 }} />Add student</summary>
            <div className="panel-body" style={{ width: "min(680px, 80vw)" }}>
              <StudentCreateForm sessions={sessions} classes={allClasses} defaultSessionId={sessionId} />
            </div>
          </details>
        </div>
      </header>

      {params.error && <div className="notice error">{errorMap[params.error] ?? "The student could not be saved."}</div>}

      <form className="filter-bar card">
        <div className="field search">
          <label>Find a student</label>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 11, top: 12, color: "var(--muted)" }} />
            <input className="input" style={{ paddingLeft: 35 }} name="q" defaultValue={query} placeholder="Name or admission number" />
          </div>
        </div>
        <div className="field">
          <label>Session</label>
          <select className="select" name="session" defaultValue={sessionId}>
            {sessions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Class</label>
          <select className="select" name="class" defaultValue={classId ?? ""}>
            <option value="">All classes</option>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        <button className="button button-secondary">Apply</button>
      </form>

      <section className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Student</th><th>Admission no.</th><th>Class</th><th>First-term fee</th><th>Balance</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {enrollments.map((item) => (
                <tr key={item.id.toString()}>
                  <td>
                    <div className="person">
                      <span className="avatar">{item.student.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
                      <div><strong>{item.student.name}</strong><div className="small muted">{item.student.gender || "Gender not set"}</div></div>
                    </div>
                  </td>
                  <td>{item.student.admissionNumber || "-"}</td>
                  <td>{item.class.name}</td>
                  <td><span className={`badge ${item.firstTermFeePaid ? "success" : "warning"}`}>{item.firstTermFeePaid ? "Paid" : "Unpaid"}</span></td>
                  <td>{money.format(Number(item.firstTermBalance))}</td>
                  <td>
                    <div className="header-actions">
                      <Link className="button button-quiet" href={`/students/${item.studentId}`}>View</Link>
                      {user.role === "OWNER" && (
                        <details className="panel">
                          <summary>Fees</summary>
                          <div className="panel-body">
                            <form action={updateFees}>
                              <input type="hidden" name="enrollmentId" value={item.id.toString()} />
                              <input type="hidden" name="term" value="first" />
                              <div className="field">
                                <label>Outstanding balance</label>
                                <input className="input" name="balance" type="number" min="0" defaultValue={Number(item.firstTermBalance)} />
                              </div>
                              <label className="small"><input name="paid" type="checkbox" defaultChecked={item.firstTermFeePaid} /> Fee paid</label>
                              <div className="form-actions"><SubmitButton pendingLabel="Updating fees...">Update</SubmitButton></div>
                            </form>
                          </div>
                        </details>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!enrollments.length && <EmptyTableRow colSpan={6} title="No students found" description="No active students match this session, class, or search. Clear the filters or add the first student." actionHref="/students" actionLabel="Add a student" />}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="page-header" style={{ marginTop: 16 }}>
        <p className="small muted">Page {page} of {totalPages} · {count} students</p>
        <div className="header-actions">
          {page > 1 && <Link className="button button-secondary" href={`?session=${sessionId}&class=${classId ?? ""}&q=${encodeURIComponent(query)}&page=${page - 1}`}>Previous</Link>}
          {page < totalPages && <Link className="button button-secondary" href={`?session=${sessionId}&class=${classId ?? ""}&q=${encodeURIComponent(query)}&page=${page + 1}`}>Next</Link>}
        </div>
      </footer>
    </>
  );
}
