"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setCurrentSession } from "@/app/actions/session";
import { showToast } from "@/components/toast";

type Session = { id: number; name: string };

export default function SessionSelector({ sessions, currentSessionId }: { sessions: Session[]; currentSessionId?: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentSessionId ?? sessions[0]?.id ?? 0);
  const [pending, startTransition] = useTransition();

  if (!sessions.length) return <span className="session-empty">No session set up</span>;

  return <div className="session-selector"><label htmlFor="portal-current-session">Current session</label><div className="session-select-wrap"><select id="portal-current-session" value={selected} disabled={pending} onChange={(event) => { const previous = selected; const id = Number(event.target.value); setSelected(id); startTransition(async () => { try { const session = await setCurrentSession(id); router.refresh(); showToast({ type: "success", title: "Current session updated", message: `${session.name} is now used across the portal.` }); } catch (cause) { setSelected(previous); showToast({ type: "error", title: "Could not change session", message: cause instanceof Error ? cause.message : "Try again." }); } }); }}>{sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}</select>{pending && <span className="spinner" aria-hidden="true" />}</div></div>;
}
