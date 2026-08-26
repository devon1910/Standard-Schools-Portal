"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { currentSessionCookieName } from "@/lib/current-session";
import { db } from "@/lib/db";

export async function setCurrentSession(sessionId: number) {
  const user = await requireUser();
  const id = z.number().int().positive().parse(sessionId);
  const session = await db.legacySession.findFirst({
    where: { id, schoolId: user.schoolId },
    select: { id: true, name: true },
  });
  if (!session) throw new Error("That session is not available for this school.");

  const cookieStore = await cookies();
  cookieStore.set(currentSessionCookieName(user.schoolId), String(session.id), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return session;
}
