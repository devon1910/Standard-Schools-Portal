"use client";

import { useActionState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { changePassword } from "@/app/actions/auth";
import PasswordInput from "@/components/password-input";

export default function ChangePasswordForm({ loginPath = "/login" }: { loginPath?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(changePassword, {});
  useEffect(() => {
    if (state.success) void signOut({ redirect: false }).then(() => { router.replace(`${loginPath}?passwordChanged=1`); router.refresh(); });
  }, [state.success, loginPath, router]);
  return <form action={action}>
    {state.error && <div className="notice error">{state.error}</div>}
    <div className="field"><label htmlFor="currentPassword">Current password</label><PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" required /></div>
    <div className="field"><label htmlFor="newPassword">New password</label><PasswordInput id="newPassword" name="newPassword" autoComplete="new-password" minLength={10} required /></div>
    <div className="field"><label htmlFor="confirmPassword">Confirm new password</label><PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" minLength={10} required /></div>
    <button className="button button-primary" aria-busy={pending} disabled={pending}>{pending ? "Updating…" : "Update password"}</button>
  </form>;
}
