"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createStudent } from "@/app/actions/admin";
import SubmitButton from "@/components/submit-button";

type SessionOption = { id: number; name: string };
type ClassOption = { id: number; name: string; sessionId: number };

export default function StudentCreateForm({
  sessions,
  classes,
  defaultSessionId,
}: {
  sessions: SessionOption[];
  classes: ClassOption[];
  defaultSessionId?: number;
}) {
  const [sessionId, setSessionId] = useState(defaultSessionId ?? sessions[0]?.id ?? 0);
  const visibleClasses = useMemo(
    () => classes.filter((item) => item.sessionId === sessionId),
    [classes, sessionId],
  );

  return (
    <form action={createStudent} className="form-grid">
      <div className="field full">
        <label>Full name</label>
        <input className="input" name="name" required />
      </div>
      <div className="field">
        <label>Admission number</label>
        <input className="input" name="admissionNumber" />
      </div>
      <div className="field">
        <label>Gender</label>
        <select className="select" name="gender">
          <option value="">Select</option>
          <option>Male</option>
          <option>Female</option>
        </select>
      </div>
      <div className="field">
        <label>Date of birth</label>
        <input className="input" name="dob" type="date" />
      </div>
      <div className="field">
        <label>Date of admission</label>
        <input className="input" name="dateOfAdmission" type="date" />
      </div>
      <div className="field">
        <label>Class at admission</label>
        <input className="input" name="classAtAdmission" />
      </div>
      <div className="field">
        <label>Parent/guardian</label>
        <input className="input" name="parentName" />
      </div>
      <div className="field">
        <label>Parent phone</label>
        <input className="input" name="parentPhone" />
      </div>
      <div className="field full">
        <label>Parent address</label>
        <textarea className="textarea" name="parentAddress" />
      </div>
      <div className="field">
        <label>Session</label>
        <select
          className="select"
          name="sessionId"
          value={sessionId}
          onChange={(event) => setSessionId(Number(event.target.value))}
          required
        >
          {sessions.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Class</label>
        <select className="select" name="classId" required disabled={!visibleClasses.length}>
          {!visibleClasses.length && <option value="">No classes in this session</option>}
          {visibleClasses.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>
      {!visibleClasses.length && (
        <div className="notice warning field full">
          This session has no classes yet. <Link href="/promotion">Copy last session&apos;s classes</Link> or <Link href="/academics">create classes</Link> first.
        </div>
      )}
      <SubmitButton
        className="button button-primary field full"
        disabled={!visibleClasses.length}
        pendingLabel="Saving student..."
      >
        Save student
      </SubmitButton>
    </form>
  );
}
