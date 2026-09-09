"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { StudentStatus } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwner, requireUser } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";

const positiveInt = z.coerce.number().int().positive();
const optionalDate = z.preprocess((value) => (value ? new Date(String(value)) : null), z.date().nullable());

export async function createSession(formData: FormData) {
  const user = await requireOwner();
  const name = z.string().trim().min(4).max(50).parse(formData.get("name"));
  const exists = await db.legacySession.findFirst({ where: { schoolId: user.schoolId, name } });
  if (exists) redirect("/academics?error=session-exists");
  await db.legacySession.create({
    data: { name, schoolId: user.schoolId, dateCreated: new Date(), modifiedBy: user.id },
  });
  revalidatePath("/academics");
}

export async function createClass(formData: FormData) {
  const user = await requireOwner();
  const data = z.object({
    name: z.string().trim().min(1).max(100),
    classTeacher: z.string().trim().max(200).optional(),
    classTypeId: positiveInt,
    sessionId: positiveInt,
  }).parse(Object.fromEntries(formData));
  const [classType, session] = await Promise.all([
    db.legacyClassType.findFirst({ where: { id: data.classTypeId, schoolId: user.schoolId } }),
    db.legacySession.findFirst({ where: { id: data.sessionId, schoolId: user.schoolId } }),
  ]);
  if (!classType || !session) redirect("/academics?error=invalid-selection");
  const duplicate = await db.legacyClass.findFirst({
    where: { schoolId: user.schoolId, sessionId: data.sessionId, name: { equals: data.name, mode: "insensitive" } },
  });
  if (duplicate) redirect("/academics?error=class-exists");
  await db.legacyClass.create({
    data: { ...data, classTeacher: data.classTeacher || null, schoolId: user.schoolId, dateCreated: new Date(), modifiedBy: user.id },
  });
  revalidatePath("/academics");
}

export async function createSubject(formData: FormData) {
  const user = await requireOwner();
  const data = z.object({ name: z.string().trim().min(1).max(100), classTypeId: positiveInt }).parse(Object.fromEntries(formData));
  const classType = await db.legacyClassType.findFirst({ where: { id: data.classTypeId, schoolId: user.schoolId } });
  if (!classType) redirect("/academics?error=invalid-selection");
  const duplicate = await db.legacySubject.findFirst({
    where: { schoolId: user.schoolId, classTypeId: data.classTypeId, name: { equals: data.name, mode: "insensitive" }, archivedAt: null },
  });
  if (duplicate) redirect("/academics?error=subject-exists");
  await db.legacySubject.create({ data: { ...data, schoolId: user.schoolId, dateCreated: new Date(), modifiedBy: user.id } });
  revalidatePath("/academics");
}

export async function createStudent(formData: FormData) {
  const user = await requireUser();
  const data = z.object({
    name: z.string().trim().min(2).max(300),
    admissionNumber: z.string().trim().max(80).optional(),
    gender: z.string().trim().max(15).optional(),
    dob: optionalDate,
    parentName: z.string().trim().max(100).optional(),
    parentPhone: z.string().trim().max(50).optional(),
    parentAddress: z.string().trim().max(500).optional(),
    classAtAdmission: z.string().trim().max(100).optional(),
    dateOfAdmission: optionalDate,
    sessionId: positiveInt,
    classId: positiveInt,
  }).parse(Object.fromEntries(formData));

  const targetClass = await db.legacyClass.findFirst({ where: { id: data.classId, sessionId: data.sessionId, schoolId: user.schoolId, archivedAt: null } });
  if (!targetClass) redirect("/students?error=invalid-class");
  const admissionNumber = data.admissionNumber?.toUpperCase() || null;
  if (admissionNumber) {
    const duplicate = await db.studentProfile.findUnique({ where: { schoolId_admissionNumber: { schoolId: user.schoolId, admissionNumber } } });
    if (duplicate) redirect("/students?error=admission-exists");
  }
  await db.studentProfile.create({
    data: {
      schoolId: user.schoolId,
      name: data.name,
      admissionNumber,
      gender: data.gender || null,
      dob: data.dob,
      parentName: data.parentName || null,
      parentPhone: data.parentPhone || null,
      parentAddress: data.parentAddress || null,
      classAtAdmission: data.classAtAdmission || null,
      dateOfAdmission: data.dateOfAdmission,
      yearOfAdmission: data.dateOfAdmission?.getFullYear().toString() ?? null,
      enrollments: { create: { schoolId: user.schoolId, sessionId: data.sessionId, classId: data.classId } },
    },
  });
  revalidatePath("/students");
}

const studentPhotoSchema = z.object({
  studentId: z.string().regex(/^\d+$/),
  photoUrl: z.string().url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
  }, "Invalid photo URL."),
  photoPublicId: z.string().trim().min(1).max(500),
});

export async function updateStudentPhoto(input: z.infer<typeof studentPhotoSchema>) {
  const user = await requireUser();
  const data = studentPhotoSchema.parse(input);
  const expectedPrefix = `standard-schools/${user.schoolId}/student-photos/`;
  if (!data.photoPublicId.startsWith(expectedPrefix)) throw new Error("Invalid photo upload.");

  const studentId = BigInt(data.studentId);
  const student = await db.studentProfile.findFirst({
    where: { id: studentId, schoolId: user.schoolId },
    select: { id: true, photoPublicId: true },
  });
  if (!student) throw new Error("Student not found.");

  await db.studentProfile.update({
    where: { id: student.id },
    data: { photoUrl: data.photoUrl, photoPublicId: data.photoPublicId },
  });
  revalidatePath(`/students/${data.studentId}`);
  revalidatePath("/reports");

  if (student.photoPublicId && student.photoPublicId !== data.photoPublicId) {
    await cloudinary.uploader.destroy(student.photoPublicId).catch(() => undefined);
  }
  return { success: true };
}

export async function updateFees(formData: FormData) {
  const user = await requireOwner();
  const enrollmentId = BigInt(z.string().regex(/^\d+$/).parse(formData.get("enrollmentId")));
  const term = z.enum(["first", "second", "third"]).parse(formData.get("term"));
  const balance = z.coerce.number().min(0).parse(formData.get("balance"));
  const paid = formData.get("paid") === "on";
  const enrollment = await db.enrollment.findFirst({ where: { id: enrollmentId, schoolId: user.schoolId } });
  if (!enrollment) return;
  const data = term === "first"
    ? { firstTermFeePaid: paid, firstTermBalance: balance }
    : term === "second"
      ? { secondTermFeePaid: paid, secondTermBalance: balance }
      : { thirdTermFeePaid: paid, thirdTermBalance: balance };
  await db.enrollment.update({ where: { id: enrollmentId }, data });
  revalidatePath("/students");
}

export async function archiveStudent(formData: FormData) {
  const user = await requireOwner();
  const studentId = BigInt(z.string().regex(/^\d+$/).parse(formData.get("studentId")));
  const student = await db.studentProfile.findFirst({ where: { id: studentId, schoolId: user.schoolId } });
  if (!student) return;
  await db.studentProfile.update({ where: { id: studentId }, data: { status: StudentStatus.ARCHIVED, archivedAt: new Date() } });
  revalidatePath("/students");
  redirect("/students?toast=student-archived");
}

const promotionSchema = z.object({
  sourceSessionId: positiveInt,
  targetSessionId: positiveInt,
  decisions: z.array(z.object({
    enrollmentId: z.string().regex(/^\d+$/),
    outcome: z.enum(["PROMOTE", "WITHDRAWN", "GRADUATED"]),
    targetClassId: positiveInt.optional(),
  })),
});

export async function promoteSession(input: z.infer<typeof promotionSchema>) {
  const user = await requireOwner();
  const data = promotionSchema.parse(input);
  if (data.sourceSessionId === data.targetSessionId) throw new Error("Choose a different target session.");
  const targetClassIds = [...new Set(data.decisions.flatMap((item) => item.targetClassId ? [item.targetClassId] : []))];
  const validTargets = await db.legacyClass.count({ where: { id: { in: targetClassIds }, schoolId: user.schoolId, sessionId: data.targetSessionId, archivedAt: null } });
  if (validTargets !== targetClassIds.length) throw new Error("One or more target classes are invalid.");

  await db.$transaction(async (tx) => {
    for (const decision of data.decisions) {
      const source = await tx.enrollment.findFirst({
        where: { id: BigInt(decision.enrollmentId), schoolId: user.schoolId, sessionId: data.sourceSessionId },
        include: { student: true },
      });
      if (!source) throw new Error("A source enrollment could not be found.");
      if (decision.outcome === "PROMOTE") {
        if (!decision.targetClassId) throw new Error("Every promoted student needs a target class.");
        await tx.enrollment.upsert({
          where: { studentId_sessionId: { studentId: source.studentId, sessionId: data.targetSessionId } },
          update: { classId: decision.targetClassId, active: true },
          create: { schoolId: user.schoolId, studentId: source.studentId, sessionId: data.targetSessionId, classId: decision.targetClassId },
        });
        await tx.studentProfile.update({ where: { id: source.studentId }, data: { status: StudentStatus.ACTIVE } });
      } else {
        await tx.studentProfile.update({ where: { id: source.studentId }, data: { status: decision.outcome } });
        await tx.enrollment.update({ where: { id: source.id }, data: { active: false } });
      }
    }
  });
  revalidatePath("/promotion");
  revalidatePath("/students");
  return { success: true };
}

export async function cloneSessionClasses(formData: FormData) {
  const user = await requireOwner();
  const sourceSessionId = positiveInt.parse(formData.get("sourceSessionId"));
  const targetSessionName = z.string().trim().min(4).max(50).parse(formData.get("targetSessionName"));
  const target = await db.legacySession.findFirst({ where: { schoolId: user.schoolId, name: targetSessionName } }) ??
    await db.legacySession.create({ data: { name: targetSessionName, schoolId: user.schoolId, dateCreated: new Date(), modifiedBy: user.id } });
  const sourceClasses = await db.legacyClass.findMany({ where: { schoolId: user.schoolId, sessionId: sourceSessionId, archivedAt: null } });
  const existing = await db.legacyClass.findMany({ where: { schoolId: user.schoolId, sessionId: target.id }, select: { name: true } });
  const existingNames = new Set(existing.map((item) => item.name.toLowerCase()));
  await db.legacyClass.createMany({ data: sourceClasses.filter((item) => !existingNames.has(item.name.toLowerCase())).map((item) => ({ name: item.name, classTeacher: item.classTeacher, classTypeId: item.classTypeId, sessionId: target.id, schoolId: user.schoolId, dateCreated: new Date(), modifiedBy: user.id })) });
  redirect(`/promotion?source=${sourceSessionId}&target=${target.id}&toast=session-created`);
}

export async function updateSchoolSettings(formData: FormData) {
  const user = await requireOwner();
  const data = z.object({
    name: z.string().trim().min(2).max(150),
    shortName: z.string().trim().min(2).max(20),
    motto: z.string().trim().max(200).optional(),
    address: z.string().trim().max(500).optional(),
    phone: z.string().trim().max(150).optional(),
    principalName: z.string().trim().max(150).optional(),
    logoUrl: z.string().trim().url().optional().or(z.literal("")),
  }).parse(Object.fromEntries(formData));
  await db.school.update({ where: { id: user.schoolId }, data: { ...data, motto: data.motto || null, address: data.address || null, phone: data.phone || null, principalName: data.principalName || null, logoUrl: data.logoUrl || null } });
  revalidatePath("/settings");
}

export async function createPortalUser(formData: FormData) {
  const owner = await requireOwner();
  const data = z.object({
    username: z.string().trim().min(4).max(80).regex(/^[a-zA-Z0-9._-]+$/),
    displayName: z.string().trim().min(2).max(120),
    role: z.enum(["OWNER", "STAFF"]),
    temporaryPassword: z.string().min(10),
  }).parse(Object.fromEntries(formData));
  await db.portalUser.create({ data: { username: data.username.toLowerCase(), displayName: data.displayName, role: data.role, passwordHash: await hash(data.temporaryPassword), schoolId: owner.schoolId, mustChangePassword: true } });
  revalidatePath("/settings");
}
