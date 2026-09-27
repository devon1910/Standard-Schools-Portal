/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowLeft, Archive, Phone, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { archiveStudent, updateStudent } from "@/app/actions/admin";
import ConfirmSubmitButton from "@/components/confirm-submit-button";
import SubmitButton from "@/components/submit-button";
import StudentDeleteConfirmation from "@/components/student-delete-confirmation";
import StudentPhotoUpload from "@/components/student-photo-upload";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, money } from "@/lib/format";

function display(value: string | null | undefined) {
  return value?.trim() || "Not provided";
}

export default async function StudentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; updated?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  if (!/^\d+$/.test(id)) notFound();

  const [student, sessions] = await Promise.all([
    db.studentProfile.findFirst({
      where: { id: BigInt(id), schoolId: user.schoolId },
      include: {
        enrollments: {
          include: { class: true },
          orderBy: { sessionId: "desc" },
        },
      },
    }),
    db.legacySession.findMany({
      where: { schoolId: user.schoolId },
      select: { id: true, name: true },
    }),
  ]);
  if (!student) notFound();

  const sessionNames = new Map(sessions.map((session) => [session.id, session.name]));
  const initials = student.name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2);

  return (
    <>
      <Link className="back-link" href="/students"><ArrowLeft size={16} />Back to students</Link>
      <header className="student-hero card">
        <div className="student-identity">
          {student.photoUrl
            ? <img className="avatar avatar-large student-profile-photo" src={student.photoUrl} alt={`${student.name}'s passport photograph`} />
            : <span className="avatar avatar-large">{initials}</span>}
          <div>
            <div className="student-title-line">
              <h2>{student.name}</h2>
              <span className={`badge ${student.status === "ACTIVE" ? "success" : "neutral"}`}>
                {student.status.toLowerCase()}
              </span>
            </div>
            <p>Admission number: <strong>{display(student.admissionNumber)}</strong></p>
          </div>
        </div>
        <div className="student-hero-actions">
          {student.status !== "ARCHIVED" && <StudentPhotoUpload studentId={student.id.toString()} studentName={student.name} />}
          {user.role === "OWNER" && student.status !== "ARCHIVED" && (
            <form action={archiveStudent}>
              <input type="hidden" name="studentId" value={student.id.toString()} />
              <ConfirmSubmitButton message={`Archive ${student.name}? Their history will be kept and the record can be restored by an administrator.`} pendingLabel="Archiving...">
                <Archive size={16} />Archive student
              </ConfirmSubmitButton>
            </form>
          )}
        </div>
      </header>

      {query.error === "admission-exists" && <div className="notice error">That admission number is already assigned to another student.</div>}
      {query.updated === "1" && <div className="notice info">Student details updated.</div>}

      {user.role === "OWNER" && <details className="card card-pad" style={{ marginBottom: 20 }}>
        <summary>Edit student details</summary>
        <form action={updateStudent} className="grid" style={{ marginTop: 20 }}>
          <input type="hidden" name="studentId" value={id} />
          <div className="profile-grid">
            {([
              ["name", "Full name", student.name], ["admissionNumber", "Admission number", student.admissionNumber],
              ["gender", "Gender", student.gender], ["classAtAdmission", "Class at admission", student.classAtAdmission],
              ["stateOfOrigin", "State of origin", student.stateOfOrigin], ["lgaOfOrigin", "Local government area", student.lgaOfOrigin],
              ["tribe", "Tribe", student.tribe], ["parentName", "Parent or guardian", student.parentName],
              ["parentPhone", "Parent phone", student.parentPhone], ["parentReligion", "Parent religion", student.parentReligion],
            ] as const).map(([name, label, value]) => <label className="field" key={name}>{label}<input className="input" name={name} defaultValue={value ?? ""} required={name === "name"} /></label>)}
            <label className="field">Date of birth<input className="input" name="dob" type="date" defaultValue={student.dob?.toISOString().slice(0, 10) ?? ""} /></label>
            <label className="field">Date of admission<input className="input" name="dateOfAdmission" type="date" defaultValue={student.dateOfAdmission?.toISOString().slice(0, 10) ?? ""} /></label>
            <label className="field profile-field-wide">Parent address<textarea className="input" name="parentAddress" defaultValue={student.parentAddress ?? ""} /></label>
          </div>
          <div className="form-actions"><SubmitButton pendingLabel="Saving...">Save changes</SubmitButton></div>
        </form>
      </details>}

      <section className="grid two-column student-details-grid">
        <div className="grid">
          <article className="card card-pad">
            <div className="section-heading"><UserRound size={18} /><h3>Student information</h3></div>
            <dl className="profile-grid">
              <div className="profile-field"><dt>Gender</dt><dd>{display(student.gender)}</dd></div>
              <div className="profile-field"><dt>Date of birth</dt><dd>{formatDate(student.dob)}</dd></div>
              <div className="profile-field"><dt>Class at admission</dt><dd>{display(student.classAtAdmission)}</dd></div>
              <div className="profile-field"><dt>Date of admission</dt><dd>{formatDate(student.dateOfAdmission)}</dd></div>
              <div className="profile-field"><dt>Year of admission</dt><dd>{display(student.yearOfAdmission)}</dd></div>
              <div className="profile-field"><dt>State of origin</dt><dd>{display(student.stateOfOrigin)}</dd></div>
              <div className="profile-field"><dt>Local government area</dt><dd>{display(student.lgaOfOrigin)}</dd></div>
              <div className="profile-field"><dt>Tribe</dt><dd>{display(student.tribe)}</dd></div>
            </dl>
          </article>

          <article className="card card-pad">
            <div className="section-heading"><Phone size={18} /><h3>Parent or guardian</h3></div>
            <dl className="profile-grid">
              <div className="profile-field"><dt>Name</dt><dd>{display(student.parentName)}</dd></div>
              <div className="profile-field"><dt>Phone</dt><dd>{display(student.parentPhone)}</dd></div>
              <div className="profile-field"><dt>Religion</dt><dd>{display(student.parentReligion)}</dd></div>
              <div className="profile-field profile-field-wide"><dt>Address</dt><dd>{display(student.parentAddress)}</dd></div>
            </dl>
          </article>
        </div>

        <article className="card enrollment-card">
          <div className="card-pad">
            <h3>Enrollment history</h3>
            <p className="small muted">Classes and fee balances recorded for each academic session.</p>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Session</th><th>Class</th><th>Fee balance</th></tr></thead>
              <tbody>
                {student.enrollments.map((item) => (
                  <tr key={item.id.toString()}>
                    <td>{sessionNames.get(item.sessionId) ?? `Session ${item.sessionId}`}</td>
                    <td>{item.class.name}</td>
                    <td>{money.format(Number(item.firstTermBalance) + Number(item.secondTermBalance) + Number(item.thirdTermBalance))}</td>
                  </tr>
                ))}
                {!student.enrollments.length && <tr><td className="empty" colSpan={3}>No enrollment history recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>
      </section>
      {user.role === "OWNER" && <section className="card card-pad" style={{ marginTop: 20 }}>
        <h3>Delete student record</h3>
        <p className="small muted">Archiving keeps the student’s history. Permanent deletion removes the profile and all related records.</p>
        <StudentDeleteConfirmation studentId={id} studentName={student.name} archived={student.status === "ARCHIVED"} />
      </section>}
    </>
  );
}
