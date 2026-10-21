"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import PasswordInput from "@/components/password-input";

export default function LoginForm({ destination = "/" }: { destination?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await signIn("credentials", {
        username: data.get("username"), password: data.get("password"), redirect: false,
        callbackUrl: new URL(destination, window.location.origin).href,
      });
      if (!result?.ok || result.error) {
        setError("The username or password is incorrect, or the account is temporarily locked.");
        setPending(false);
        return;
      }
      router.push(destination);
      router.refresh();
    } catch {
      setError("Sign-in failed. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {error && <div className="notice error" role="alert">{error}</div>}
      <div className="field"><label htmlFor="username">Username</label><input className="input" id="username" name="username" autoComplete="username" required autoFocus /></div>
      <div className="field"><label htmlFor="password">Password</label><PasswordInput id="password" name="password" autoComplete="current-password" required /></div>
      <button className="button button-primary" aria-busy={pending} disabled={pending} type="submit"><LogIn size={17} />{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
