"use server";

import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAccount } from "@/lib/auth";

export type PasswordState = { error?: string; success?: boolean };

export async function changePassword(_: PasswordState, formData: FormData): Promise<PasswordState> {
  const user = await requireAccount();
  const parsed = z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(10, "Use at least 10 characters."),
      confirmPassword: z.string(),
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      message: "The new passwords do not match.",
      path: ["confirmPassword"],
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid password." };

  const account = await db.portalUser.findFirst({ where: { id: user.id, schoolId: user.schoolId } });
  if (!account || !(await verify(account.passwordHash, parsed.data.currentPassword))) {
    return { error: "Current password is incorrect." };
  }

  const updated = await db.portalUser.updateMany({
    where: { id: account.id, schoolId: user.schoolId, isActive: true, sessionVersion: user.sessionVersion, passwordHash: account.passwordHash },
    data: { passwordHash: await hash(parsed.data.newPassword), mustChangePassword: false, sessionVersion: { increment: 1 } },
  });
  if (!updated.count) return { error: "This account changed. Sign in again or ask your school for help." };
  return { success: true };
}
