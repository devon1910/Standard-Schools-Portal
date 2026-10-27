"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { promoteSession } from "@/app/actions/admin";
import { setCurrentSession } from "@/app/actions/session";
import { showToast } from "@/components/toast";
import { promotionTargets, repeatedTarget, suggestedPromotionTarget } from "@/lib/promotion";

type SourceClass = { id: number; name: string; students: Array<{ enrollmentId: string; name: string; studentId: string | null }> };
type TargetClass = { id: number; name: string };
type Outcome = "PROMOTE" | "REPEATED" | "WITHDRAWN" | "GRADUATED";

export default function PromotionWizard({ sourceSessionId, targetSessionId, sourceClasses, targetClasses }: { sourceSessionId: number; targetSessionId: number; sourceClasses: SourceClass[]; targetClasses: TargetClass[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [classTargets, setClassTargets] = useState<Record<number, number | undefined>>(() => Object.fromEntries(sourceClasses.map((item) => [item.id, suggestedPromotionTarget(item.name, targetClasses)])));
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>(() => Object.fromEntries(sourceClasses.flatMap((item) => item.students.map((student) => [student.enrollmentId, "PROMOTE"]))));
  const totals = useMemo(() => Object.values(outcomes).reduce((value, outcome) => ({ ...value, [outcome]: value[outcome] + 1 }), { PROMOTE: 0, REPEATED: 0, WITHDRAWN: 0, GRADUATED: 0 }), [outcomes]);

  function submit() {
    setError("");
    const decisions = sourceClasses.flatMap((sourceClass) => sourceClass.students.map((student) => ({ enrollmentId: student.enrollmentId, outcome: outcomes[student.enrollmentId], targetClassId: outcomes[student.enrollmentId] === "PROMOTE" ? classTargets[sourceClass.id] : undefined })));
    startTransition(async () => {
      try { await promoteSession({ sourceSessionId, targetSessionId, decisions }); await setCurrentSession(targetSessionId); showToast({ type: "success", title: "Session promotion complete", message: `${totals.PROMOTE + totals.REPEATED} student enrollments were saved in the new session.` }); router.push(`/students?session=${targetSessionId}`); router.refresh(); }
      catch (cause) {
        const reference = cause instanceof Error && "digest" in cause && typeof cause.digest === "string" ? cause.digest : null;
        const message = reference
          ? `The server could not complete this request. Reference: ${reference}. Check the target session before trying again.`
          : cause instanceof Error ? cause.message : "Promotion could not be completed.";
        setError(message);
        showToast({ type: "error", title: "Promotion could not be completed", message });
      }
    });
  }

  const invalidSelection = sourceClasses.some((sourceClass) => sourceClass.students.some((student) =>
    outcomes[student.enrollmentId] === "PROMOTE" ? !classTargets[sourceClass.id] :
      outcomes[student.enrollmentId] === "REPEATED" && !repeatedTarget(sourceClass.name, targetClasses)));

  return <section className="card card-pad">
    {error && <div className="notice error">{error}</div>}
    <div className="notice info">Promotion moves students to a higher class. Repeated keeps the same class in the new session. Students who leave school remain in history.</div>
    {sourceClasses.map((sourceClass) => {
      const targets = promotionTargets(sourceClass.name, targetClasses);
      const repeatClassId = repeatedTarget(sourceClass.name, targetClasses);
      return <div className="wizard-class" key={sourceClass.id}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div><h3>{sourceClass.name}</h3><p className="small muted">{sourceClass.students.length} active students</p></div>
          <div className="field">
            <label htmlFor={`promotion-target-${sourceClass.id}`}>Promote into</label>
            <select id={`promotion-target-${sourceClass.id}`} className="select" value={classTargets[sourceClass.id] ?? ""} disabled={pending || !targets.length} onChange={(event) => setClassTargets((current) => ({ ...current, [sourceClass.id]: Number(event.target.value) || undefined }))}>
              <option value="">{targets.length ? "Choose a higher class" : "No higher class available"}</option>
              {targets.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}
            </select>
          </div>
        </div>
        {!targets.length && sourceClass.students.length > 0 && <p className="small muted">Choose Repeated, Left school, or Graduated for each student, or add a higher class in Academics. Check the class name if its level is not recognised.</p>}
        {!repeatClassId && sourceClass.students.length > 0 && <p className="small muted">Create one matching class for {sourceClass.name} in the new session to use Repeated.</p>}
        <div className="wizard-students">{sourceClass.students.map((student) => <div className="wizard-student" key={student.enrollmentId}>
          <div><strong>{student.name}</strong><div className="small muted">{student.studentId || "No student ID"}</div></div>
          <select className="select" aria-label={`Outcome for ${student.name}`} disabled={pending} value={outcomes[student.enrollmentId]} onChange={(event) => setOutcomes((current) => ({ ...current, [student.enrollmentId]: event.target.value as Outcome }))}>
            <option value="PROMOTE">Promote</option><option value="REPEATED" disabled={!repeatClassId}>Repeated</option><option value="WITHDRAWN">Left school</option><option value="GRADUATED">Graduated</option>
          </select>
        </div>)}</div>
      </div>;
    })}
    <footer className="page-header" style={{ margin: "20px 0 0" }}>
      <p><strong>{totals.PROMOTE}</strong> promoted · <strong>{totals.REPEATED}</strong> repeated · <strong>{totals.WITHDRAWN}</strong> left · <strong>{totals.GRADUATED}</strong> graduated</p>
      <button className="button button-primary" aria-busy={pending} disabled={pending || invalidSelection || !Object.keys(outcomes).length} onClick={submit}>{pending ? "Creating enrollments..." : "Confirm session promotion"}</button>
    </footer>
  </section>;
}
