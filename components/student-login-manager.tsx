"use client";

import { useActionState } from "react";
import { issueStudentLogin, setStudentLoginEnabled } from "@/app/actions/family-access";
import SubmitButton from "@/components/submit-button";

type Account = { username: string; isActive: boolean; mustChangePassword: boolean };

export default function StudentLoginManager({ studentProfileId, account, loginUrl, archived }: {
  studentProfileId: string; account: Account | null; loginUrl: string; archived: boolean;
}) {
  const [state, action, pending] = useActionState(issueStudentLogin, {});
  return <section className="card card-pad" style={{ marginTop: 20 }}>
    <h3>Student and guardian report access</h3>
    <p className="small muted">This account can view only this student&apos;s published report cards. Give the credentials to the student or guardian through a private channel.</p>
    <p>Report portal: <a href={loginUrl} target="_blank" rel="noreferrer">{loginUrl}</a></p>
    {account && <p>Username: <strong>{account.username}</strong> · {account.isActive ? "Enabled" : "Disabled"}{account.mustChangePassword ? " · Password change required" : ""}</p>}
    {archived && <p className="notice warning">Report access is blocked while the student is archived.</p>}
    {state.error && <p className="notice error" role="alert">{state.error}</p>}
    {state.temporaryPassword && <div className="notice success" role="status">
      <p>Copy these credentials now. The temporary password appears only after creation or reset.</p>
      <p>Username: <strong>{state.username}</strong></p>
      <p>Temporary password: <code style={{ overflowWrap: "anywhere" }}>{state.temporaryPassword}</code></p>
      <p>The student or guardian must change this password at first sign-in.</p>
    </div>}
    <div className="header-actions" style={{ flexWrap: "wrap" }}>
      <form action={action}>
        <input type="hidden" name="studentProfileId" value={studentProfileId} />
        <button className="button button-primary" disabled={pending || archived}>{pending ? "Preparing credentials..." : account ? "Reset password and enable access" : "Create student login"}</button>
      </form>
      {account && <form action={setStudentLoginEnabled}>
        <input type="hidden" name="studentProfileId" value={studentProfileId} />
        <input type="hidden" name="enabled" value={String(!account.isActive)} />
        <SubmitButton className="button button-secondary" disabled={pending || (archived && !account.isActive)} pendingLabel="Updating access...">{account.isActive ? "Disable access" : "Enable access"}</SubmitButton>
      </form>}
    </div>
    {account && <p className="small muted">Resetting the password or disabling access ends all current sessions for this account.</p>}
  </section>;
}
