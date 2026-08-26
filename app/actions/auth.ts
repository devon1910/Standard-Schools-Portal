"use server";

import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type PasswordState = { error?: string; success?: boolean };

export async function changePassword(_: PasswordState, formData: FormData): Promise<PasswordState> {
  const user = await requireUser();
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

  await db.portalUser.update({
    where: { id: account.id },
    data: { passwordHash: await hash(parsed.data.newPassword), mustChangePassword: false },
  });
  return { success: true };
}
