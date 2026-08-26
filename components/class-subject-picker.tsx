"use client";

import { useState, useTransition } from "react";
import { configureClassSubjects } from "@/app/actions/results";
import { showToast } from "@/components/toast";

type Subject = { id: number; name: string };

export default function ClassSubjectPicker({
  classId,
  canEdit,
  subjects,
  selected,
}: {
  classId: number;
  canEdit: boolean;
  subjects: Subject[];
  selected: number[];
}) {
  const [values, setValues] = useState(new Set(selected));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function toggle(subjectId: number, checked: boolean) {
    setValues((current) => {
      const next = new Set(current);
      if (checked) next.add(subjectId);
      else next.delete(subjectId);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      try {
        await configureClassSubjects(classId, [...values]);
        setMessage("Subject list saved.");
        showToast({ type: "success", title: "Subject list saved", message: "The class score sheets now use this subject list." });
      } catch (error) {
        const text = error instanceof Error ? error.message : "Could not save subjects.";
        setMessage(text);
        showToast({ type: "error", title: "Could not save subjects", message: text });
      }
    });
  }

  return (
    <div>
      {!canEdit && <div className="notice info">Only an owner can change the class subject list.</div>}
      <div className="grid three-column">
        {subjects.map((subject) => (
          <label key={subject.id} className="card card-pad small">
            <input type="checkbox" checked={values.has(subject.id)} disabled={!canEdit} onChange={(event) => toggle(subject.id, event.target.checked)} /> {subject.name}
          </label>
        ))}
      </div>
      {message && <p className="small">{message}</p>}
      {canEdit && <div className="form-actions"><button className="button button-primary" aria-busy={pending} disabled={pending} onClick={save}>{pending ? "Saving…" : "Save subject list"}</button></div>}
    </div>
  );
}
