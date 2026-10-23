"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { setCurrentSession } from "@/app/actions/session";
import { showToast } from "@/components/toast";

type Session = { id: number; name: string };

export default function SessionSelector({ sessions, currentSessionId }: { sessions: Session[]; currentSessionId?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = Number(searchParams.get("session"));
  const activeSessionId = sessions.some((session) => session.id === requested) ? requested : currentSessionId ?? sessions[0]?.id ?? 0;
  const [selected, setSelected] = useState(activeSessionId);
  const [previousSessionId, setPreviousSessionId] = useState(activeSessionId);
  if (previousSessionId !== activeSessionId) {
    setPreviousSessionId(activeSessionId);
    setSelected(activeSessionId);
  }
  const [pending, startTransition] = useTransition();

  if (!sessions.length) return <span className="session-empty">No session set up</span>;

  return <div className="session-selector"><label htmlFor="portal-current-session">Current session</label><div className="session-select-wrap"><select id="portal-current-session" value={selected} disabled={pending} onChange={(event) => {
    const previous = selected;
    const id = Number(event.target.value);
    setSelected(id);
    startTransition(async () => {
      try {
        const session = await setCurrentSession(id);
        const params = new URLSearchParams(searchParams.toString());
        params.set("session", String(id));
        for (const key of ["class", "subject", "page"]) params.delete(key);
        if (pathname === "/promotion") {
          params.delete("source");
          params.delete("target");
        }
        router.replace(`${pathname}?${params.toString()}`);
        showToast({ type: "success", title: "Current session updated", message: `${session.name} is now used across the portal.` });
      } catch (cause) {
        setSelected(previous);
        showToast({ type: "error", title: "Could not change session", message: cause instanceof Error ? cause.message : "Try again." });
      }
    });
  }}>{sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}</select>{pending && <span className="spinner" aria-hidden="true" />}</div></div>;
}
