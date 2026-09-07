import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "@/components/login-form";
import Image from "next/image";

export default async function LoginPage() {
  if (await getSession()) redirect("/dashboard");
  return (
    <main className="auth-page">
      <section className="auth-hero">
        <Image className="auth-logo" src="/brand/lockup-horizontal-inverse.svg" alt="Standard Schools" width={300} height={40} priority />
        <div>
          <span className="auth-kicker">School operations, made clear</span>
          <h1>One standard for every school record.</h1>
          <p>Students, fees, academic sessions, questions and report cards—organised in one dependable workspace.</p>
        </div>
        <small>Secure administration portal · Built for focused work</small>
      </section>
      <section className="auth-form-side">
        <div className="auth-card">
          <h2>Welcome back</h2>
          <p>Sign in to continue to your school workspace.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
