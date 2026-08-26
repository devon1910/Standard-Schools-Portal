import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ChangePasswordForm from "@/components/change-password-form";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <main className="auth-page"><section className="auth-hero"><div><strong>{session.user.schoolName}</strong></div><div><h1>Secure your account.</h1><p>Replace the temporary password before continuing to school records.</p></div><small>Signed in as {session.user.username}</small></section><section className="auth-form-side"><div className="auth-card"><h2>Change password</h2><p>Use at least 10 characters and keep it private.</p><ChangePasswordForm /></div></section></main>;
}
