/* eslint-disable @next/next/no-img-element */
import type { ClassReportData } from "@/lib/report-data";
import { formatDate } from "@/lib/format";
import { ordinal } from "@/lib/result-calculations";

type StudentSummary = ClassReportData["students"][number];

const behaviours = [
  ["concentration", "Concentration"], ["schoolAttendance", "School attendance"], ["assignments", "Assignments"], ["punctuality", "Punctuality"],
  ["classParticipation", "Class participation"], ["attitudeToProperty", "Attitude to property"], ["cleanliness", "Cleanliness"], ["generalConduct", "General conduct"],
] as const;

function Rating({ value }: { value: number | null | undefined }) {
  return <span className="rating-boxes">{[1, 2, 3, 4, 5].map((rating) => <span className={`rating-box ${value === rating ? "on" : ""}`} key={rating}>{rating}</span>)}</span>;
}

export default function ReportCard({ data, student }: { data: ClassReportData; student: StudentSummary }) {
  const report = student.report;
  return (
    <article className="report-card">
      {report?.status !== "PUBLISHED" && <div className="draft-watermark">DRAFT</div>}
      <header className="report-header">
        <div>{data.school.logoUrl ? <img src={data.school.logoUrl} alt="School logo" className="report-logo" /> : <img src="/brand/mark-mono-black.svg" alt="" className="report-logo report-brand-mark" />}</div>
        <div className="report-heading"><h1>{data.school.name}</h1>{data.school.motto && <p>MOTTO: {data.school.motto}</p>}<p>{data.school.address}</p><p>{data.school.phone}</p></div>
        <div>{student.enrollment.student.photoUrl ? <img src={student.enrollment.student.photoUrl} alt="Student" className="report-photo" /> : <div className="report-photo report-placeholder">PHOTO</div>}</div>
      </header>
      <h2 className="report-title">{data.setup?.reportTitle ?? "CONTINUOUS ASSESSMENT"}</h2>
      <section className="report-meta">
        <p><strong>NAME:</strong> {student.enrollment.student.name.toUpperCase()}</p><p><strong>SEX:</strong> {student.enrollment.student.gender?.toUpperCase() ?? "-"}</p>
        <p><strong>CLASS:</strong> {data.classInfo.name.toUpperCase()}</p><p><strong>SESSION:</strong> {data.session.name}</p>
        <p><strong>STUDENT ID:</strong> {student.enrollment.student.admissionNumber ?? "-"}</p><p><strong>TERM:</strong> {data.term.name.toUpperCase()}</p>
        <p><strong>HIGHEST CLASS AVERAGE:</strong> {data.highestAverage.toFixed(2)}</p><p><strong>POSITION:</strong> {student.position ? ordinal(student.position) : "-"}</p>
        <p><strong>TOTAL STUDENTS IN CLASS:</strong> {data.classSize}</p><p><strong>LOWEST CLASS AVERAGE:</strong> {data.lowestAverage.toFixed(2)}</p>
      </section>
      <div className="attendance-bar"><span>ATTENDANCE</span><span>SCHOOL OPENED: {data.setup?.schoolOpened ?? "-"}</span><span>TIMES PRESENT: {report?.timesPresent ?? "-"}</span></div>
      <table className="result-table"><thead><tr><th>SUBJECT</th><th>FIRST TEST</th><th>SECOND TEST</th><th>EXAM</th><th>TOTAL</th><th>GRADE</th><th>SUBJECT PTN</th><th>REMARK</th></tr></thead><tbody>{student.rows.map((row) => <tr key={row.subjectId}><td>{row.subject.toUpperCase()}</td><td>{row.firstTest ?? "-"}</td><td>{row.secondTest ?? "-"}</td><td>{row.exam ?? "-"}</td><td>{row.total ?? "-"}</td><td>{row.grade}</td><td>{row.position}</td><td>{row.remark}</td></tr>)}</tbody></table>
      <div className="report-total"><span>TOTAL: {student.total} OUT OF {student.rows.length * 100}</span><span>CUMULATIVE AVERAGE: {student.average.toFixed(2)}</span></div>
      <section className="grade-key"><strong>KEYS TO POSITION GRADE</strong><div><span>[0–39] = F</span><span>[40–49] = E</span><span>[50–59] = D</span><span>[60–69] = C</span><span>[70–79] = B</span><span>[80–89] = A</span><span>[90–100] = A+</span></div></section>
      <h3 className="behaviour-title">BEHAVIOURS</h3>
      <section className="behaviour-grid">{behaviours.map(([key, label]) => <div className="behaviour-row" key={key}><span>{label.toUpperCase()}</span><Rating value={report?.[key]} /></div>)}</section>
      <section className="report-comments"><span><strong>CLASS TEACHER REMARK:</strong> {report?.teacherRemark ?? "-"}</span><strong>SIGNATURES:</strong><span><strong>PRINCIPAL’S REMARK:</strong> {report?.principalRemark ?? "-"}</span><span /><span><strong>DATE OF RESUMPTION:</strong> {formatDate(data.setup?.resumptionDate)}</span></section>
      <footer className="report-names"><span>CLASS TEACHER’S NAME: {data.classInfo.classTeacher?.toUpperCase() ?? "-"}</span><span>PRINCIPAL’S NAME: {data.school.principalName?.toUpperCase() ?? "-"}</span></footer>
    </article>
  );
}
