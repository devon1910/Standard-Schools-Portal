"use server";

import { revalidatePath } from "next/cache";
import { ReportStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOwner, requireUser } from "@/lib/auth";

const positiveInt = z.number().int().positive();

export async function configureClassSubjects(classId: number, subjectIds: number[]) {
  const user = await requireOwner();
  const targetClass = await db.legacyClass.findFirst({ where: { id: classId, schoolId: user.schoolId } });
  if (!targetClass) throw new Error("Class not found.");
  const valid = await db.legacySubject.findMany({ where: { id: { in: subjectIds }, schoolId: user.schoolId, archivedAt: null }, select: { id: true } });
  if (valid.length !== new Set(subjectIds).size) throw new Error("Invalid subject selection.");
  await db.$transaction([
    db.classSubject.deleteMany({ where: { classId, schoolId: user.schoolId } }),
    db.classSubject.createMany({ data: valid.map(({ id }) => ({ schoolId: user.schoolId, classId, subjectId: id })) }),
  ]);
  revalidatePath("/results");
  return { success: true };
}

const scoreSheetSchema = z.object({
  classId: positiveInt,
  termId: positiveInt,
  subjectId: positiveInt,
  scores: z.array(z.object({
    enrollmentId: z.string().regex(/^\d+$/),
    firstTest: z.number().int().min(0).max(20).nullable(),
    secondTest: z.number().int().min(0).max(20).nullable(),
    exam: z.number().int().min(0).max(60).nullable(),
  })),
});

export async function saveScoreSheet(input: z.infer<typeof scoreSheetSchema>) {
  const user = await requireUser();
  const data = scoreSheetSchema.parse(input);
  const [configured, term] = await Promise.all([
    db.classSubject.findFirst({ where: { schoolId: user.schoolId, classId: data.classId, subjectId: data.subjectId } }),
    db.legacyTerm.findFirst({ where: { id: data.termId, schoolId: user.schoolId } }),
  ]);
  if (!configured || !term) throw new Error("Configure this subject for the class and choose a valid term first.");
  const enrollmentIds = data.scores.map((item) => BigInt(item.enrollmentId));
  const validCount = await db.enrollment.count({ where: { id: { in: enrollmentIds }, schoolId: user.schoolId, classId: data.classId, active: true } });
  if (validCount !== enrollmentIds.length) throw new Error("The score sheet contains an invalid student.");
  await db.$transaction(data.scores.map((score) => db.resultScore.upsert({
    where: { enrollmentId_termId_subjectId: { enrollmentId: BigInt(score.enrollmentId), termId: data.termId, subjectId: data.subjectId } },
    update: { firstTest: score.firstTest, secondTest: score.secondTest, exam: score.exam },
    create: { schoolId: user.schoolId, enrollmentId: BigInt(score.enrollmentId), termId: data.termId, subjectId: data.subjectId, firstTest: score.firstTest, secondTest: score.secondTest, exam: score.exam },
  })));
  revalidatePath("/results");
  return { success: true };
}

export async function saveTermReport(formData: FormData) {
  const user = await requireUser();
  const rating = z.coerce.number().int().min(1).max(5).nullable();
  const parsed = z.object({
    enrollmentId: z.string().regex(/^\d+$/),
    termId: z.coerce.number().int().positive(),
    timesPresent: z.coerce.number().int().min(0),
    concentration: rating,
    schoolAttendance: rating,
    assignments: rating,
    punctuality: rating,
    classParticipation: rating,
    attitudeToProperty: rating,
    cleanliness: rating,
    generalConduct: rating,
    teacherRemark: z.string().trim().max(500),
    principalRemark: z.string().trim().max(500),
  }).parse(Object.fromEntries(formData));
  const enrollmentId = BigInt(parsed.enrollmentId);
  const enrollment = await db.enrollment.findFirst({ where: { id: enrollmentId, schoolId: user.schoolId } });
  if (!enrollment) throw new Error("Student enrollment not found.");
  const term = await db.legacyTerm.findFirst({ where: { id: parsed.termId, schoolId: user.schoolId } });
  if (!term) throw new Error("Term not found.");
  const setup = await db.termSetup.findUnique({ where: { schoolId_sessionId_termId: { schoolId: user.schoolId, sessionId: enrollment.sessionId, termId: parsed.termId } } });
  if (setup && parsed.timesPresent > setup.schoolOpened) throw new Error("Times present cannot exceed days opened.");
  const reportData = {
    termId: parsed.termId,
    timesPresent: parsed.timesPresent,
    concentration: parsed.concentration,
    schoolAttendance: parsed.schoolAttendance,
    assignments: parsed.assignments,
    punctuality: parsed.punctuality,
    classParticipation: parsed.classParticipation,
    attitudeToProperty: parsed.attitudeToProperty,
    cleanliness: parsed.cleanliness,
    generalConduct: parsed.generalConduct,
    teacherRemark: parsed.teacherRemark,
    principalRemark: parsed.principalRemark,
  };
  await db.termReport.upsert({
    where: { enrollmentId_termId: { enrollmentId, termId: parsed.termId } },
    update: reportData,
    create: { ...reportData, schoolId: user.schoolId, enrollmentId },
  });
  revalidatePath("/reports");
}

export async function saveTermSetup(formData: FormData) {
  const user = await requireOwner();
  const data = z.object({
    sessionId: z.coerce.number().int().positive(),
    termId: z.coerce.number().int().positive(),
    schoolOpened: z.coerce.number().int().min(1).max(250),
    resumptionDate: z.string().optional(),
    reportTitle: z.string().trim().min(2).max(100),
  }).parse(Object.fromEntries(formData));
  const [session, term] = await Promise.all([
    db.legacySession.findFirst({ where: { id: data.sessionId, schoolId: user.schoolId } }),
    db.legacyTerm.findFirst({ where: { id: data.termId, schoolId: user.schoolId } }),
  ]);
  if (!session || !term) throw new Error("Choose a valid session and term.");
  await db.termSetup.upsert({
    where: { schoolId_sessionId_termId: { schoolId: user.schoolId, sessionId: data.sessionId, termId: data.termId } },
    update: { schoolOpened: data.schoolOpened, reportTitle: data.reportTitle, resumptionDate: data.resumptionDate ? new Date(data.resumptionDate) : null },
    create: { schoolId: user.schoolId, sessionId: data.sessionId, termId: data.termId, schoolOpened: data.schoolOpened, reportTitle: data.reportTitle, resumptionDate: data.resumptionDate ? new Date(data.resumptionDate) : null },
  });
  revalidatePath("/reports");
}

export async function publishClassReports(classId: number, termId: number) {
  const user = await requireOwner();
  const [targetClass, term] = await Promise.all([
    db.legacyClass.findFirst({ where: { id: classId, schoolId: user.schoolId } }),
    db.legacyTerm.findFirst({ where: { id: termId, schoolId: user.schoolId } }),
  ]);
  if (!targetClass || !term) throw new Error("Choose a valid class and term.");
  const enrollments = await db.enrollment.findMany({
    where: { schoolId: user.schoolId, classId, active: true },
    include: { scores: { where: { termId } }, reports: { where: { termId } } },
  });
  const subjectCount = await db.classSubject.count({ where: { schoolId: user.schoolId, classId } });
  if (!subjectCount || !enrollments.length) throw new Error("Configure subjects and enroll students first.");
  for (const enrollment of enrollments) {
    const completeScores = enrollment.scores.filter((score) => score.firstTest !== null && score.secondTest !== null && score.exam !== null);
    const report = enrollment.reports[0];
    const completeRatings = report && [report.concentration, report.schoolAttendance, report.assignments, report.punctuality, report.classParticipation, report.attitudeToProperty, report.cleanliness, report.generalConduct].every((value) => value !== null);
    if (completeScores.length !== subjectCount || report?.timesPresent === null || report?.timesPresent === undefined || !completeRatings || !report.teacherRemark || !report.principalRemark) {
      throw new Error(`Results are incomplete for enrollment ${enrollment.id}.`);
    }
  }
  await db.termReport.updateMany({
    where: { schoolId: user.schoolId, termId, enrollment: { classId, active: true } },
    data: { status: ReportStatus.PUBLISHED, publishedAt: new Date(), publishedBy: user.id },
  });
  revalidatePath("/reports");
  return { success: true };
}
