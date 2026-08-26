"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cloudinary } from "@/lib/cloudinary";

export async function createQuestion(input: unknown) {
  const user = await requireUser();
  const data = z.object({
    subjectId: z.number().int().positive(),
    classId: z.number().int().positive(),
    termId: z.number().int().positive(),
    sessionId: z.number().int().positive(),
    type: z.enum(["CA", "Exam"]),
    questionUrl: z.string().url(),
    filePublicId: z.string().min(1),
  }).parse(input);
  const [targetClass, subject, term, session] = await Promise.all([
    db.legacyClass.findFirst({ where: { id: data.classId, schoolId: user.schoolId, sessionId: data.sessionId } }),
    db.legacySubject.findFirst({ where: { id: data.subjectId, schoolId: user.schoolId } }),
    db.legacyTerm.findFirst({ where: { id: data.termId, schoolId: user.schoolId } }),
    db.legacySession.findFirst({ where: { id: data.sessionId, schoolId: user.schoolId } }),
  ]);
  if (!targetClass || !subject || !term || !session) throw new Error("Invalid session, term, class or subject.");
  const duplicate = await db.legacyQuestion.findFirst({
    where: {
      schoolId: user.schoolId,
      sessionId: data.sessionId,
      termId: data.termId,
      classId: data.classId,
      subjectId: data.subjectId,
      type: data.type,
      archivedAt: null,
    },
  });
  if (duplicate) throw new Error("This question already exists.");
  await db.legacyQuestion.create({
    data: { ...data, schoolId: user.schoolId, dateCreated: new Date(), modifiedBy: user.id },
  });
  revalidatePath("/questions");
  return { success: true };
}

export async function archiveQuestion(id: number) {
  const user = await requireUser();
  const question = await db.legacyQuestion.findFirst({ where: { id, schoolId: user.schoolId, archivedAt: null } });
  if (!question) return;
  await db.legacyQuestion.update({ where: { id }, data: { archivedAt: new Date(), modifiedBy: user.id } });
  revalidatePath("/questions");
}

export async function permanentlyDeleteQuestion(id: number) {
  const user = await requireUser();
  const question = await db.legacyQuestion.findFirst({ where: { id, schoolId: user.schoolId } });
  if (!question) return;
  await cloudinary.uploader.destroy(question.filePublicId, { resource_type: "image" });
  await db.legacyQuestion.delete({ where: { id } });
  revalidatePath("/questions");
}
