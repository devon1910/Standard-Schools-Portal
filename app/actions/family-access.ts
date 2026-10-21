"use server";

import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { setPasswordAuditContext } from "@/lib/password-audit";

export type StudentLoginState = { error?: string; username?: string; temporaryPassword?: string };

export async function issueStudentLogin(_: StudentLoginState, formData: FormData): Promise<StudentLoginState> {
  const owner = await requireOwner();
  const parsed = z.string().regex(/^\d+$/).safeParse(formData.get("studentProfileId"));
  if (!parsed.success) return { error: "Choose a valid student." };
  const student = await db.studentProfile.findFirst({ where: { id: BigInt(parsed.data), schoolId: owner.schoolId, archivedAt: null, status: { not: "ARCHIVED" } } });
  if (!student) return { error: "Student not found or archived." };
  const temporaryPassword = randomBytes(18).toString("base64url");
  const passwordHash = await hash(temporaryPassword);
  const account = await db.$transaction(async (tx) => {
    await setPasswordAuditContext(tx, { source: "SCHOOL_OWNER", actorId: owner.id });
    return tx.portalUser.upsert({
      where: { studentProfileId: student.id },
      create: {
        studentProfileId: student.id, schoolId: owner.schoolId, role: "STUDENT",
        username: `student.${owner.schoolId}.${student.id}`, displayName: student.name,
        passwordHash, mustChangePassword: true,
      },
      update: { passwordHash, mustChangePassword: true, isActive: true, failedLoginAttempts: 0, lockedUntil: null, sessionVersion: { increment: 1 } },
      select: { username: true },
    });
  });
  revalidatePath(`/students/${student.id}`);
  return { username: account.username, temporaryPassword };
}

export async function setStudentLoginEnabled(formData: FormData) {
  const owner = await requireOwner();
  const data = z.object({ studentProfileId: z.string().regex(/^\d+$/), enabled: z.enum(["true", "false"]) }).parse(Object.fromEntries(formData));
  const enabled = data.enabled === "true";
  await db.portalUser.updateMany({
    where: {
      schoolId: owner.schoolId, role: "STUDENT", studentProfileId: BigInt(data.studentProfileId),
      ...(enabled ? { studentProfile: { schoolId: owner.schoolId, status: { not: "ARCHIVED" }, archivedAt: null } } : {}),
    },
    data: { isActive: enabled, sessionVersion: { increment: 1 } },
  });
  revalidatePath(`/students/${data.studentProfileId}`);
}
