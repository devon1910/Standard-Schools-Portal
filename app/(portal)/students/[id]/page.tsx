import Link from "next/link";
import { ArrowLeft, Archive, Phone, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { archiveStudent } from "@/app/actions/admin";
import ConfirmSubmitButton from "@/components/confirm-submit-button";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, money } from "@/lib/format";

function display(value: string | null | undefined) {
  return value?.trim() || "Not provided";
}

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
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
          <span className="avatar avatar-large">{initials}</span>
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
        {user.role === "OWNER" && student.status !== "ARCHIVED" && (
          <form action={archiveStudent}>
            <input type="hidden" name="studentId" value={student.id.toString()} />
            <ConfirmSubmitButton message={`Archive ${student.name}? Their history will be kept and the record can be restored by an administrator.`} pendingLabel="Archiving...">
              <Archive size={16} />Archive student
            </ConfirmSubmitButton>
          </form>
        )}
      </header>

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
    </>
  );
}
