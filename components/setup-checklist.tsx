import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

type Step = { label: string; description: string; complete: boolean; href: string; action: string };

export default function SetupChecklist({ sessionName, hasSession, classCount, subjectCount, studentCount }: { sessionName?: string; hasSession: boolean; classCount: number; subjectCount: number; studentCount: number }) {
  const steps: Step[] = [
    { label: "Create an academic session", description: sessionName ? `${sessionName} is selected.` : "Add the school year you want to work in.", complete: hasSession, href: "/academics", action: "Create session" },
    { label: "Set up classes", description: classCount ? `${classCount} classes are ready in this session.` : "Create classes or copy them from the previous session.", complete: classCount > 0, href: "/academics", action: "Set up classes" },
    { label: "Add subjects", description: subjectCount ? `${subjectCount} subjects are available.` : "Create the subjects taught by each class category.", complete: subjectCount > 0, href: "/academics", action: "Add subjects" },
    { label: "Add or copy students", description: studentCount ? `${studentCount} students are enrolled in this session.` : "Add new students or promote existing students into this session.", complete: studentCount > 0, href: "/students", action: "Manage students" },
  ];
  const completed = steps.filter((step) => step.complete).length;
  if (completed === steps.length) return null;

  return <section className="card setup-checklist"><div className="card-pad setup-heading"><div><h3>Session setup</h3><p className="small muted">Complete these essentials in order to start using the portal.</p></div><span className="setup-progress">{completed}/{steps.length} complete</span></div><div className="setup-steps">{steps.map((step, index) => <div className={`setup-step ${step.complete ? "complete" : ""}`} key={step.label}>{step.complete ? <CheckCircle2 size={21} /> : <Circle size={21} />}<div><strong>{index + 1}. {step.label}</strong><p>{step.description}</p></div>{!step.complete && <Link className="button button-secondary" href={step.href}>{step.action}</Link>}</div>)}</div></section>;
}
