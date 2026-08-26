import { cookies } from "next/headers";

export type SessionOption = { id: number; name: string };

export function currentSessionCookieName(schoolId: number) {
  return `portal-current-session-${schoolId}`;
}

export async function getCurrentSessionId(
  schoolId: number,
  sessions: SessionOption[],
  requestedSession?: string,
) {
  const requested = Number(requestedSession);
  if (requested && sessions.some((session) => session.id === requested)) return requested;

  const cookieStore = await cookies();
  const saved = Number(cookieStore.get(currentSessionCookieName(schoolId))?.value);
  if (saved && sessions.some((session) => session.id === saved)) return saved;

  return sessions[0]?.id;
}
