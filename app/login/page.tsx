import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "@/components/login-form";

export default async function LoginPage() {
  if (await getSession()) redirect("/dashboard");
  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div><strong>STANDARD SCHOOLS</strong></div>
        <div>
          <h1>A calmer way to run the school day.</h1>
          <p>Students, fees, academic sessions, questions and report cards, kept together and ready when your team needs them.</p>
        </div>
        <small>Secure administration portal</small>
      </section>
      <section className="auth-form-side">
        <div className="auth-card">
          <h2>Welcome back</h2>
          <p>Sign in with your school administrator account.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
