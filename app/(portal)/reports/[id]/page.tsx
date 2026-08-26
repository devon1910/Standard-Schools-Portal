import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveTermReport } from "@/app/actions/results";
import SubmitButton from "@/components/submit-button";

const behaviours = [
  ["concentration", "Concentration"], ["schoolAttendance", "School attendance"], ["assignments", "Assignments"], ["punctuality", "Punctuality"],
  ["classParticipation", "Class participation"], ["attitudeToProperty", "Attitude to property"], ["cleanliness", "Cleanliness"], ["generalConduct", "General conduct"],
] as const;

export default async function PrepareReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ term?: string }> }) {
  const user = await requireUser();
  const { id } = await params; const query = await searchParams; const termId = Number(query.term);
  if (!/^\d+$/.test(id) || !termId) notFound();
  const enrollment = await db.enrollment.findFirst({ where: { id: BigInt(id), schoolId: user.schoolId }, include: { student: true, class: true, reports: { where: { termId } } } });
  if (!enrollment) notFound();
  const setup = await db.termSetup.findUnique({ where: { schoolId_sessionId_termId: { schoolId: user.schoolId, sessionId: enrollment.sessionId, termId } } });
  const report = enrollment.reports[0];
  return <><header className="page-header"><div><h2>{enrollment.student.name}</h2><p>{enrollment.class.name} · Complete attendance, behaviours and remarks.</p></div></header>{!setup && <div className="notice error">An owner must configure term report settings before attendance can be validated.</div>}<section className="card card-pad" style={{ maxWidth: 900 }}><form action={saveTermReport} className="form-grid"><input type="hidden" name="enrollmentId" value={id} /><input type="hidden" name="termId" value={termId} /><div className="field full"><label>Times present {setup ? `(out of ${setup.schoolOpened})` : ""}</label><input className="input" name="timesPresent" type="number" min="0" max={setup?.schoolOpened} defaultValue={report?.timesPresent ?? 0} required /></div>{behaviours.map(([name, label]) => <div className="field" key={name}><label>{label}</label><select className="select" name={name} defaultValue={report?.[name] ?? ""} required><option value="">Choose rating</option>{[1, 2, 3, 4, 5].map((rating) => <option value={rating} key={rating}>{rating}: {rating === 5 ? "Excellent" : rating === 4 ? "Very good" : rating === 3 ? "Good" : rating === 2 ? "Fair" : "Needs attention"}</option>)}</select></div>)}<div className="field full"><label>Class teacher remark</label><textarea className="textarea" name="teacherRemark" defaultValue={report?.teacherRemark ?? ""} required /></div><div className="field full"><label>Principal’s remark</label><textarea className="textarea" name="principalRemark" defaultValue={report?.principalRemark ?? ""} required /></div><SubmitButton className="button button-primary field full" pendingLabel="Saving report...">Save report details</SubmitButton></form></section></>;
}
