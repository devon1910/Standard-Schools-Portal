"use client";

import { useActionState, useState } from "react";
import { configureStudentIds } from "@/app/actions/admin";
import { formatStudentId } from "@/lib/student-id";

export default function StudentIdSettingsForm() {
  const [state, action, pending] = useActionState(configureStudentIds, {});
  const [prefix, setPrefix] = useState("SS");
  const [digits, setDigits] = useState(3);
  const [start, setStart] = useState(1);
  return <form action={action} className="form-grid">
    <p className="notice warning field full">The year/admission-class/number format works without setup. Only use this form if you want a custom prefix for future students. You can set a custom format only once. The prefix and number width cannot change after you save. Check them before you confirm.</p>
    {state.error && <p className="notice error field full" role="alert">{state.error}</p>}
    <label className="field">Prefix<input className="input" name="prefix" value={prefix} onChange={(event) => setPrefix(event.target.value.toUpperCase())} pattern="[A-Za-z][A-Za-z-]{0,19}" maxLength={20} required /></label>
    <label className="field">Number width<input className="input" name="digits" type="number" min={1} max={10} value={digits} onChange={(event) => setDigits(Number(event.target.value))} required /></label>
    <label className="field">Starting number<input className="input" name="start" type="number" min={1} max={2_000_000_000} value={start} onChange={(event) => setStart(Number(event.target.value))} required /></label>
    <p className="field full">First student ID: <strong>{formatStudentId(prefix, Math.max(1, Math.min(10, digits)), start)}</strong>. Examples: SS001, HG002, ADM0002. The number grows beyond the width when needed. Existing identifiers stay the same.</p>
    <label className="field full"><span><input name="confirmed" type="checkbox" required /> I understand that this format can only be set once.</span></label>
    <button className="button button-primary field full" disabled={pending}>{pending ? "Saving..." : "Save permanent student ID format"}</button>
  </form>;
}
