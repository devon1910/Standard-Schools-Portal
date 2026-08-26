"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { promoteSession } from "@/app/actions/admin";
import { setCurrentSession } from "@/app/actions/session";
import { showToast } from "@/components/toast";

type SourceClass = { id: number; name: string; students: Array<{ enrollmentId: string; name: string; admissionNumber: string | null }> };
type TargetClass = { id: number; name: string };
type Outcome = "PROMOTE" | "WITHDRAWN" | "GRADUATED";

function suggestedTarget(source: string, targets: TargetClass[]) {
  const incremented = source.replace(/(\d+)/, (value) => String(Number(value) + 1));
  return targets.find((item) => item.name.toLowerCase() === incremented.toLowerCase())?.id ?? targets.find((item) => item.name.toLowerCase() === source.toLowerCase())?.id ?? targets[0]?.id;
}

export default function PromotionWizard({ sourceSessionId, targetSessionId, sourceClasses, targetClasses }: { sourceSessionId: number; targetSessionId: number; sourceClasses: SourceClass[]; targetClasses: TargetClass[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [classTargets, setClassTargets] = useState<Record<number, number>>(() => Object.fromEntries(sourceClasses.map((item) => [item.id, suggestedTarget(item.name, targetClasses)])));
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>(() => Object.fromEntries(sourceClasses.flatMap((item) => item.students.map((student) => [student.enrollmentId, "PROMOTE"]))));
  const totals = useMemo(() => Object.values(outcomes).reduce((value, outcome) => ({ ...value, [outcome]: value[outcome] + 1 }), { PROMOTE: 0, WITHDRAWN: 0, GRADUATED: 0 }), [outcomes]);

  function submit() {
    setError("");
    const decisions = sourceClasses.flatMap((sourceClass) => sourceClass.students.map((student) => ({ enrollmentId: student.enrollmentId, outcome: outcomes[student.enrollmentId], targetClassId: outcomes[student.enrollmentId] === "PROMOTE" ? classTargets[sourceClass.id] : undefined })));
    startTransition(async () => {
      try { await promoteSession({ sourceSessionId, targetSessionId, decisions }); await setCurrentSession(targetSessionId); showToast({ type: "success", title: "Session promotion complete", message: `${totals.PROMOTE} student enrollments were created in the new session.` }); router.push(`/students?session=${targetSessionId}`); router.refresh(); }
      catch (cause) { const message = cause instanceof Error ? cause.message : "Promotion could not be completed."; setError(message); showToast({ type: "error", title: "Promotion could not be completed", message }); }
    });
  }

  return <section className="card card-pad">{error && <div className="notice error">{error}</div>}<div className="notice info">Review target classes carefully. Unselected leavers remain in history and are never deleted.</div>{sourceClasses.map((sourceClass) => <div className="wizard-class" key={sourceClass.id}><div className="page-header" style={{ marginBottom: 0 }}><div><h3>{sourceClass.name}</h3><p className="small muted">{sourceClass.students.length} active students</p></div><div className="field"><label>Promote into</label><select className="select" value={classTargets[sourceClass.id]} onChange={(event) => setClassTargets((current) => ({ ...current, [sourceClass.id]: Number(event.target.value) }))}>{targetClasses.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}</select></div></div><div className="wizard-students">{sourceClass.students.map((student) => <div className="wizard-student" key={student.enrollmentId}><div><strong>{student.name}</strong><div className="small muted">{student.admissionNumber || "No admission number"}</div></div><select className="select" value={outcomes[student.enrollmentId]} onChange={(event) => setOutcomes((current) => ({ ...current, [student.enrollmentId]: event.target.value as Outcome }))}><option value="PROMOTE">Promote</option><option value="WITHDRAWN">Left school</option><option value="GRADUATED">Graduated</option></select></div>)}</div></div>)}<footer className="page-header" style={{ margin: "20px 0 0" }}><p><strong>{totals.PROMOTE}</strong> promoted · <strong>{totals.WITHDRAWN}</strong> left · <strong>{totals.GRADUATED}</strong> graduated</p><button className="button button-primary" aria-busy={pending} disabled={pending || !targetClasses.length} onClick={submit}>{pending ? "Creating enrollments…" : "Confirm session promotion"}</button></footer></section>;
}
