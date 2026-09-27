"use client";

import { useRef, useState } from "react";
import { Archive, Trash2 } from "lucide-react";
import { archiveStudent, deleteStudent } from "@/app/actions/admin";
import SubmitButton from "@/components/submit-button";

export default function StudentDeleteConfirmation({ studentId, studentName, archived }: { studentId: string; studentName: string; archived: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState("");

  return <>
    <button className="button button-danger" type="button" onClick={() => { setConfirmation(""); dialog.current?.showModal(); }}><Trash2 size={16} />Delete student</button>
    <dialog ref={dialog} aria-labelledby="delete-student-title" style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 24, maxWidth: 480, width: "calc(100% - 32px)", boxShadow: "0 20px 60px #0005" }}>
      <h3 id="delete-student-title">Delete {studentName}?</h3>
      <p>Permanently deleting this student also removes their enrollment history, scores, and reports. This cannot be undone.</p>
      {!archived && <p><strong>Consider archiving instead.</strong> Archiving removes the student from the active list and keeps their records.</p>}
      <label className="field">Type DELETE to confirm permanent deletion
        <input className="input" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
      </label>
      <div className="form-actions" style={{ flexWrap: "wrap" }}>
        <button className="button button-secondary" type="button" onClick={() => dialog.current?.close()}>Cancel</button>
        {!archived && <form action={archiveStudent}>
          <input type="hidden" name="studentId" value={studentId} />
          <SubmitButton pendingLabel="Archiving..."><Archive size={16} />Archive instead</SubmitButton>
        </form>}
        <form action={deleteStudent}>
          <input type="hidden" name="studentId" value={studentId} />
          <button className="button button-danger" type="submit" disabled={confirmation !== "DELETE"}><Trash2 size={16} />Permanently delete</button>
        </form>
      </div>
    </dialog>
  </>;
}
