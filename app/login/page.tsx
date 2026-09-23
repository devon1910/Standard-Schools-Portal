import Image from "next/image";
import { redirect } from "next/navigation";
import { Mail, School } from "lucide-react";
import LoginForm from "@/components/login-form";
import { getSession } from "@/lib/auth";

const schoolEnquiryHref = "mailto:davidsonekpokpobe@gmail.com?subject=Standard%20Schools%20Portal%20%E2%80%94%20School%20Account%20Enquiry&body=Hello%20David%2C%0A%0AI%20would%20like%20to%20create%20a%20Standard%20Schools%20Portal%20account%20for%20my%20school.%0A%0ASchool%20name%3A%20%0AContact%20name%3A%20%0APhone%20number%3A%20%0A%0AThank%20you.";

export default async function LoginPage() {
  if (await getSession()) redirect("/dashboard");
  return (
    <main className="auth-page">
      <section className="auth-hero">
        <Image className="auth-logo" src="/brand/lockup-horizontal-inverse.svg" alt="Standard Schools" width={300} height={40} priority />
        <div>
          <span className="auth-kicker">School operations, made clear</span>
          <h1>One standard for every school record.</h1>
          <p>Students, fees, academic sessions, questions and report cards—organised in one dependable workspace for your school.</p>
        </div>
        <small>Secure administration portal · One private workspace per school</small>
      </section>
      <section className="auth-form-side">
        <div className="auth-card">
          <h2>Welcome back</h2>
          <p>Sign in to continue to your school workspace.</p>
          <LoginForm />
          <div className="school-onboarding">
            <School size={21} aria-hidden="true" />
            <div>
              <strong>Want to bring your school on board?</strong>
              <p>Contact us to create a secure workspace for your school.</p>
              <a className="button button-secondary" href={schoolEnquiryHref}>
                <Mail size={16} aria-hidden="true" /> Contact us
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
