import Image from "next/image";
import { redirect } from "next/navigation";
import LoginForm from "@/components/login-form";
import { getSession } from "@/lib/auth";

export default async function FamilyLoginPage({ searchParams }: { searchParams: Promise<{ passwordChanged?: string }> }) {
  const session = await getSession();
  if (session) redirect(session.user.role === "STUDENT" ? "/family" : "/dashboard");
  const query = await searchParams;
  return <main className="auth-page">
    <section className="auth-hero">
      <Image className="auth-logo" src="/brand/lockup-horizontal-inverse.svg" alt="Standard Schools" width={300} height={40} priority />
      <div><span className="auth-kicker">Student and guardian portal</span><h1>Your school reports, in one place.</h1><p>View published report cards for each academic session. Print a copy or save it as a PDF.</p></div>
      <small>Private report access for each student</small>
    </section>
    <section className="auth-form-side"><div className="auth-card">
      <h2>Student and guardian sign in</h2>
      <p>Use the username and password from your school. Ask the school to reset a forgotten password.</p>
      {query.passwordChanged === "1" && <p className="notice success">Password changed. Sign in with your new password.</p>}
      <LoginForm destination="/family" />
    </div></section>
  </main>;
}
