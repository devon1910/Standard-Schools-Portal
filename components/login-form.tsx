"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      username: data.get("username"), password: data.get("password"), redirect: false,
    });
    if (!result?.ok) {
      setError("The username or password is incorrect, or the account is temporarily locked.");
      setPending(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      {error && <div className="notice error" role="alert">{error}</div>}
      <div className="field"><label htmlFor="username">Username</label><input className="input" id="username" name="username" autoComplete="username" required autoFocus /></div>
      <div className="field"><label htmlFor="password">Password</label><input className="input" id="password" name="password" type="password" autoComplete="current-password" required /></div>
      <button className="button button-primary" aria-busy={pending} disabled={pending} type="submit"><LogIn size={17} />{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
