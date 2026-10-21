import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import ChangePasswordForm from "@/components/change-password-form";
import { LogoutButton } from "@/components/portal-nav";

export default async function FamilyPasswordPage() {
  const user = await requireAccount("/family/login");
  if (user.role !== "STUDENT") redirect("/change-password");
  return <main className="auth-page">
    <section className="auth-hero"><strong>{user.schoolName}</strong><div><h1>Choose your password.</h1><p>Replace the temporary password before you open report cards.</p></div><div>Signed in as {user.username}<br /><LogoutButton loginPath="/family/login" /></div></section>
    <section className="auth-form-side"><div className="auth-card"><h2>Change password</h2><p>Use at least 10 characters. Keep your password private.</p><ChangePasswordForm loginPath="/family/login" /></div></section>
  </main>;
}
