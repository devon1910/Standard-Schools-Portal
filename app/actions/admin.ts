"use server";

import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { StudentStatus } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwner, requireUser } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";
import { MAX_STUDENT_IMPORT_ROWS, parseImportDate, studentImportRowSchema, type StudentImportRow } from "@/lib/student-import";
import { validateOrigin } from "@/lib/nigeria-locations";
import { allocateStudentIds, StudentIdSetupRequired } from "@/lib/allocate-student-ids";
import { studentIdConfigSchema } from "@/lib/student-id";
import { setPasswordAuditContext } from "@/lib/password-audit";
import { canPromote, normalizedClassName, repeatedTarget } from "@/lib/promotion";

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
  const existingClasses = await db.legacyClass.findMany({
    where: { schoolId: user.schoolId, sessionId: data.sessionId },
    select: { name: true },
  });
  if (existingClasses.some((item) => normalizedClassName(item.name) === normalizedClassName(data.name))) redirect("/academics?error=class-exists");
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
    gender: z.enum(["Male", "Female", ""]),
    dob: optionalDate,
    parentName: z.string().trim().max(100).optional(),
    parentPhone: z.string().trim().max(50).optional(),
    parentAddress: z.string().trim().max(500).optional(),
    classAtAdmission: z.string().trim().max(100).optional(),
    stateOfOrigin: z.string().trim().max(100).optional(),
    lgaOfOrigin: z.string().trim().max(100).optional(),
    tribe: z.string().trim().max(100).optional(),
    parentReligion: z.string().trim().max(100).optional(),
    dateOfAdmission: optionalDate,
    sessionId: positiveInt,
    classId: positiveInt,
  }).parse(Object.fromEntries(formData));
  const origin = validateOrigin(data.stateOfOrigin ?? "", data.lgaOfOrigin ?? "");
  if (origin.error) throw new Error(origin.error);

  const targetClass = await db.legacyClass.findFirst({ where: { id: data.classId, sessionId: data.sessionId, schoolId: user.schoolId, archivedAt: null } });
  if (!targetClass) redirect("/students?error=invalid-class");
  try {
    await db.$transaction(async (tx) => {
      const [studentId] = await allocateStudentIds(tx, user.schoolId, 1);
      await tx.studentProfile.create({
        data: {
          schoolId: user.schoolId,
          name: data.name,
          studentId,
          gender: data.gender || null,
          dob: data.dob,
          parentName: data.parentName || null,
          parentPhone: data.parentPhone || null,
          parentAddress: data.parentAddress || null,
          classAtAdmission: data.classAtAdmission || null,
          stateOfOrigin: origin.state || null,
          lgaOfOrigin: origin.lga || null,
          tribe: data.tribe || null,
          parentReligion: data.parentReligion || null,
          dateOfAdmission: data.dateOfAdmission,
          yearOfAdmission: data.dateOfAdmission?.getFullYear().toString() ?? null,
          enrollments: { create: { schoolId: user.schoolId, sessionId: data.sessionId, classId: data.classId } },
        },
      });
    });
  } catch (error) {
    if (error instanceof StudentIdSetupRequired) redirect("/students?error=student-id-setup-required");
    throw error;
  }
  revalidatePath("/students");
}

export type StudentImportResult = {
  success: boolean;
  imported: number;
  errors: { rowNumber: number; message: string }[];
};

export async function importStudents(input: {
  sessionId: number;
  rows: StudentImportRow[];
}): Promise<StudentImportResult> {
  const user = await requireUser();
  const selection = z.object({
    sessionId: positiveInt,
    rows: z.array(studentImportRowSchema).min(1).max(MAX_STUDENT_IMPORT_ROWS),
  }).safeParse(input);

  if (!selection.success) {
    return { success: false, imported: 0, errors: [{ rowNumber: 0, message: "The import data is invalid or exceeds 1,000 rows." }] };
  }

  const { sessionId, rows } = selection.data;
  const classes = await db.legacyClass.findMany({
    where: { sessionId, schoolId: user.schoolId, archivedAt: null },
    select: { id: true, name: true },
  });

  const errors: StudentImportResult["errors"] = [];
  const normalized = rows.flatMap((row) => {
    const matches = classes.filter((item) => normalizedClassName(item.name) === normalizedClassName(row.className));
    if (matches.length !== 1) {
      errors.push({ rowNumber: row.rowNumber, message: `Class "${row.className}" must match one class in the selected session.` });
      return [];
    }
    const targetClass = matches[0];
    const origin = validateOrigin(row.stateOfOrigin, row.lgaOfOrigin);
    if (origin.error) {
      errors.push({ rowNumber: row.rowNumber, message: origin.error });
      return [];
    }
    const dob = parseImportDate(row.dob);
    const dateOfAdmission = parseImportDate(row.dateOfAdmission);
    if (dob === undefined || dateOfAdmission === undefined) {
      errors.push({ rowNumber: row.rowNumber, message: "Dates must use YYYY-MM-DD format." });
      return [];
    }
    return [{ ...row, dob, dateOfAdmission, classId: targetClass.id, stateOfOrigin: origin.state, lgaOfOrigin: origin.lga }];
  });

  if (errors.length) return { success: false, imported: 0, errors: errors.sort((a, b) => a.rowNumber - b.rowNumber) };

  try {
    await db.$transaction(async (tx) => {
      const ids = await allocateStudentIds(tx, user.schoolId, normalized.length);
      for (const [index, row] of normalized.entries()) {
        await tx.studentProfile.create({
          data: {
            schoolId: user.schoolId,
            name: row.name,
            studentId: ids[index],
            gender: row.gender || null,
            dob: row.dob,
            dateOfAdmission: row.dateOfAdmission,
            yearOfAdmission: row.dateOfAdmission?.getFullYear().toString() ?? null,
            classAtAdmission: row.classAtAdmission || row.className,
            parentName: row.parentName || null,
            parentPhone: row.parentPhone || null,
            parentAddress: row.parentAddress || null,
            stateOfOrigin: row.stateOfOrigin || null,
            lgaOfOrigin: row.lgaOfOrigin || null,
            tribe: row.tribe || null,
            parentReligion: row.parentReligion || null,
            enrollments: { create: { schoolId: user.schoolId, sessionId, classId: row.classId } },
          },
        });
      }
    }, { timeout: 60_000 });
  } catch (error) {
    if (error instanceof StudentIdSetupRequired) return { success: false, imported: 0, errors: [{ rowNumber: 0, message: error.message }] };
    throw error;
  }

  revalidatePath("/students");
  return { success: true, imported: normalized.length, errors: [] };
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

export async function updateStudent(formData: FormData) {
  const user = await requireOwner();
  const data = z.object({
    studentId: z.string().regex(/^\d+$/),
    name: z.string().trim().min(2).max(300),
    gender: z.enum(["Male", "Female", ""]),
    dob: optionalDate,
    classAtAdmission: z.string().trim().max(100),
    dateOfAdmission: optionalDate,
    stateOfOrigin: z.string().trim().max(100),
    lgaOfOrigin: z.string().trim().max(100).optional().default(""),
    tribe: z.string().trim().max(100),
    parentName: z.string().trim().max(100),
    parentPhone: z.string().trim().max(50),
    parentAddress: z.string().trim().max(500),
    parentReligion: z.string().trim().max(100),
  }).parse(Object.fromEntries(formData));
  const origin = validateOrigin(data.stateOfOrigin, data.lgaOfOrigin);
  if (origin.error) throw new Error(origin.error);
  const id = BigInt(data.studentId);
  const student = await db.studentProfile.findFirst({ where: { id, schoolId: user.schoolId } });
  if (!student) throw new Error("Student not found.");
  await db.studentProfile.update({ where: { id }, data: {
    name: data.name, gender: data.gender || null, dob: data.dob,
    classAtAdmission: data.classAtAdmission || null, dateOfAdmission: data.dateOfAdmission,
    yearOfAdmission: data.dateOfAdmission?.getFullYear().toString() ?? null,
    stateOfOrigin: origin.state || null, lgaOfOrigin: origin.lga || null,
    tribe: data.tribe || null, parentName: data.parentName || null,
    parentPhone: data.parentPhone || null, parentAddress: data.parentAddress || null,
    parentReligion: data.parentReligion || null,
  } });
  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  redirect(`/students/${id}?updated=1`);
}

export async function deleteStudent(formData: FormData) {
  const user = await requireOwner();
  const id = BigInt(z.string().regex(/^\d+$/).parse(formData.get("studentId")));
  const student = await db.studentProfile.findFirst({ where: { id, schoolId: user.schoolId }, select: { id: true, photoPublicId: true } });
  if (!student) throw new Error("Student not found.");
  await db.$transaction(async (tx) => {
    const enrollments = await tx.enrollment.findMany({ where: { studentId: id, schoolId: user.schoolId }, select: { id: true } });
    const enrollmentIds = enrollments.map((item) => item.id);
    await tx.resultScore.deleteMany({ where: { enrollmentId: { in: enrollmentIds }, schoolId: user.schoolId } });
    await tx.termReport.deleteMany({ where: { enrollmentId: { in: enrollmentIds }, schoolId: user.schoolId } });
    await tx.enrollment.deleteMany({ where: { studentId: id, schoolId: user.schoolId } });
    await tx.studentProfile.delete({ where: { id } });
  });
  if (student.photoPublicId) await cloudinary.uploader.destroy(student.photoPublicId).catch(() => undefined);
  revalidatePath("/students");
  redirect("/students?toast=student-deleted");
}

const promotionSchema = z.object({
  sourceSessionId: positiveInt,
  targetSessionId: positiveInt,
  decisions: z.array(z.object({
    enrollmentId: z.string().regex(/^\d+$/),
    outcome: z.enum(["PROMOTE", "REPEATED", "WITHDRAWN", "GRADUATED"]),
    targetClassId: positiveInt.optional(),
  })),
});

export async function promoteSession(input: z.infer<typeof promotionSchema>) {
  const user = await requireOwner();
  const data = promotionSchema.parse(input);
  if (data.sourceSessionId === data.targetSessionId) throw new Error("Choose a different target session.");
  if (new Set(data.decisions.map((item) => item.enrollmentId)).size !== data.decisions.length) throw new Error("A student can have only one promotion decision.");

  await db.$transaction(async (tx) => {
    const sessions = await tx.legacySession.count({ where: { id: { in: [data.sourceSessionId, data.targetSessionId] }, schoolId: user.schoolId } });
    if (sessions !== 2) throw new Error("Choose valid source and target sessions.");
    const targetClasses = await tx.legacyClass.findMany({ where: { schoolId: user.schoolId, sessionId: data.targetSessionId, archivedAt: null }, select: { id: true, name: true } });
    for (const decision of data.decisions) {
      const source = await tx.enrollment.findFirst({
        where: { id: BigInt(decision.enrollmentId), schoolId: user.schoolId, sessionId: data.sourceSessionId, active: true, class: { schoolId: user.schoolId, sessionId: data.sourceSessionId, archivedAt: null } },
        include: { class: true },
      });
      if (!source) throw new Error("A source enrollment could not be found.");
      if (decision.outcome === "PROMOTE" || decision.outcome === "REPEATED") {
        const targetClassId = decision.outcome === "REPEATED" ? repeatedTarget(source.class.name, targetClasses) : decision.targetClassId;
        const targetClass = targetClasses.find((item) => item.id === targetClassId);
        if (!targetClass) throw new Error(decision.outcome === "REPEATED" ? `Create one matching class for ${source.class.name} in the new session before repeating students.` : "Every promoted student needs a valid target class.");
        if (decision.outcome === "PROMOTE" && !canPromote(source.class.name, targetClass.name)) throw new Error("Students can only be promoted to a higher class. Use Repeated to keep the same class.");
        await tx.enrollment.upsert({
          where: { studentId_sessionId: { studentId: source.studentId, sessionId: data.targetSessionId } },
          update: { classId: targetClass.id, active: true },
          create: { schoolId: user.schoolId, studentId: source.studentId, sessionId: data.targetSessionId, classId: targetClass.id },
        });
        await tx.studentProfile.update({ where: { id: source.studentId }, data: { status: StudentStatus.ACTIVE } });
      } else {
        await tx.studentProfile.update({ where: { id: source.studentId }, data: { status: decision.outcome } });
        await tx.enrollment.update({ where: { id: source.id }, data: { active: false } });
      }
    }
  }, { timeout: 60_000 });
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
  const existingNames = new Set(existing.map((item) => normalizedClassName(item.name)));
  const missingClasses = sourceClasses.filter((item) => {
    const name = normalizedClassName(item.name);
    if (existingNames.has(name)) return false;
    existingNames.add(name);
    return true;
  });
  await db.legacyClass.createMany({ data: missingClasses.map((item) => ({ name: item.name, classTeacher: item.classTeacher, classTypeId: item.classTypeId, sessionId: target.id, schoolId: user.schoolId, dateCreated: new Date(), modifiedBy: user.id })) });
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
  }).parse(Object.fromEntries(formData));
  await db.school.update({ where: { id: user.schoolId }, data: { ...data, motto: data.motto || null, address: data.address || null, phone: data.phone || null, principalName: data.principalName || null } });
  revalidatePath("/(portal)", "layout");
}

const schoolLogoSchema = z.object({
  publicId: z.string().min(1).max(500),
  version: z.number().int().positive(),
  format: z.enum(["jpg", "jpeg", "png", "webp"]),
  signature: z.string().regex(/^[a-f0-9]{40,64}$/),
});

export async function saveSchoolLogo(input: z.infer<typeof schoolLogoSchema>) {
  const user = await requireOwner();
  const data = schoolLogoSchema.parse(input);
  const prefix = `standard-schools/${user.schoolId}/logos/`;
  if (!data.publicId.startsWith(prefix) || !/^[a-zA-Z0-9_-]+$/.test(data.publicId.slice(prefix.length))) {
    throw new Error("Invalid logo upload. Please choose the file again.");
  }
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!secret || !process.env.CLOUDINARY_CLOUD_NAME) throw new Error("Logo uploads are unavailable. Please try again later.");
  const expected = cloudinary.utils.api_sign_request({ public_id: data.publicId, version: data.version }, secret);
  if (expected.length !== data.signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(data.signature))) {
    throw new Error("The logo upload could not be verified. Please choose the file again.");
  }
  const school = await db.school.findUnique({ where: { id: user.schoolId }, select: { logoPublicId: true } });
  if (!school) throw new Error("School not found.");
  // Derive the delivery URL from the verified asset ID, version, and format.
  const logoUrl = cloudinary.url(data.publicId, { secure: true, version: data.version, resource_type: "image", type: "upload", format: data.format });
  await db.school.update({ where: { id: user.schoolId }, data: { logoUrl, logoPublicId: data.publicId } });
  revalidatePath("/(portal)", "layout");
  if (school.logoPublicId?.startsWith(prefix) && school.logoPublicId !== data.publicId) {
    await cloudinary.uploader.destroy(school.logoPublicId, { invalidate: true }).catch(() => undefined);
  }
}

export async function removeSchoolLogo() {
  const user = await requireOwner();
  const school = await db.school.findUnique({ where: { id: user.schoolId }, select: { logoPublicId: true } });
  if (!school) throw new Error("School not found.");
  await db.school.update({ where: { id: user.schoolId }, data: { logoUrl: null, logoPublicId: null } });
  revalidatePath("/(portal)", "layout");
  if (school.logoPublicId?.startsWith(`standard-schools/${user.schoolId}/logos/`)) {
    await cloudinary.uploader.destroy(school.logoPublicId, { invalidate: true }).catch(() => undefined);
  }
}

export async function configureStudentIds(_: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const user = await requireOwner();
  const parsed = studentIdConfigSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the student ID format." };
  const result = await db.school.updateMany({
    where: { id: user.schoolId, studentIdPrefix: null },
    data: { studentIdPrefix: parsed.data.prefix, studentIdDigits: parsed.data.digits, nextStudentNumber: parsed.data.start },
  });
  if (!result.count) return { error: "The student ID format is already set. It cannot be changed." };
  revalidatePath("/settings");
  revalidatePath("/students");
  return {};
}

export async function createPortalUser(formData: FormData) {
  const owner = await requireOwner();
  const data = z.object({
    username: z.string().trim().min(4).max(80).regex(/^[a-zA-Z0-9._-]+$/),
    displayName: z.string().trim().min(2).max(120),
    role: z.enum(["OWNER", "STAFF"]),
    temporaryPassword: z.string().min(10),
  }).parse(Object.fromEntries(formData));
  const passwordHash = await hash(data.temporaryPassword);
  await db.$transaction(async (tx) => {
    await setPasswordAuditContext(tx, { source: "SCHOOL_OWNER", actorId: owner.id });
    await tx.portalUser.create({ data: { username: data.username.toLowerCase(), displayName: data.displayName, role: data.role, passwordHash, schoolId: owner.schoolId, mustChangePassword: true } });
  });
  revalidatePath("/settings");
}
