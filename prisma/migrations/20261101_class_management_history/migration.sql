CREATE TABLE "ClassTeacherChange" (
  "id" BIGSERIAL PRIMARY KEY,
  "schoolId" INTEGER NOT NULL,
  "classId" INTEGER NOT NULL,
  "previousTeacher" TEXT,
  "newTeacher" TEXT,
  "changedById" TEXT NOT NULL,
  "changedByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ClassTeacherChange_schoolId_classId_createdAt_idx"
  ON "ClassTeacherChange" ("schoolId", "classId", "createdAt");

CREATE TABLE "EnrollmentClassChange" (
  "id" BIGSERIAL PRIMARY KEY,
  "schoolId" INTEGER NOT NULL,
  "enrollmentId" BIGINT NOT NULL,
  "sessionId" INTEGER NOT NULL,
  "previousClassId" INTEGER NOT NULL,
  "newClassId" INTEGER NOT NULL,
  "changedById" TEXT NOT NULL,
  "changedByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "EnrollmentClassChange_schoolId_enrollmentId_createdAt_idx"
  ON "EnrollmentClassChange" ("schoolId", "enrollmentId", "createdAt");
CREATE INDEX "EnrollmentClassChange_schoolId_sessionId_createdAt_idx"
  ON "EnrollmentClassChange" ("schoolId", "sessionId", "createdAt");
