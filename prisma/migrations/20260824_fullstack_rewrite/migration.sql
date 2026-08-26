CREATE TYPE "UserRole" AS ENUM ('OWNER', 'STAFF');
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'GRADUATED', 'ARCHIVED');
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'PUBLISHED');

ALTER TABLE "Classes" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Subjects" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Questions" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE TABLE "School" (
  "id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "shortName" TEXT NOT NULL,
  "motto" TEXT,
  "address" TEXT,
  "phone" TEXT,
  "logoUrl" TEXT,
  "logoPublicId" TEXT,
  "principalName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

INSERT INTO "School" ("id", "name", "shortName", "updatedAt") VALUES
  (1, 'Standard High School', 'SHS', CURRENT_TIMESTAMP),
  (2, 'Standard International School', 'SIS', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "PortalUser" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "schoolId" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
  "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PortalUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PortalUser_username_key" ON "PortalUser"("username");

CREATE TABLE "StudentProfile" (
  "id" BIGSERIAL NOT NULL,
  "schoolId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "admissionNumber" TEXT,
  "gender" TEXT,
  "dob" TIMESTAMP(3),
  "tribe" TEXT,
  "stateOfOrigin" TEXT,
  "lgaOfOrigin" TEXT,
  "classAtAdmission" TEXT,
  "dateOfAdmission" TIMESTAMP(3),
  "yearOfAdmission" TEXT,
  "parentName" TEXT,
  "parentAddress" TEXT,
  "parentPhone" TEXT,
  "parentReligion" TEXT,
  "photoUrl" TEXT,
  "photoPublicId" TEXT,
  "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudentProfile_schoolId_admissionNumber_key" ON "StudentProfile"("schoolId", "admissionNumber");
CREATE INDEX "StudentProfile_schoolId_name_idx" ON "StudentProfile"("schoolId", "name");

CREATE TABLE "Enrollment" (
  "id" BIGSERIAL NOT NULL,
  "schoolId" INTEGER NOT NULL,
  "studentId" BIGINT NOT NULL,
  "sessionId" INTEGER NOT NULL,
  "classId" INTEGER NOT NULL,
  "legacyStudentId" BIGINT,
  "firstTermFeePaid" BOOLEAN NOT NULL DEFAULT false,
  "firstTermBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "secondTermFeePaid" BOOLEAN NOT NULL DEFAULT false,
  "secondTermBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "thirdTermFeePaid" BOOLEAN NOT NULL DEFAULT false,
  "thirdTermBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Enrollment_legacyStudentId_key" ON "Enrollment"("legacyStudentId");
CREATE UNIQUE INDEX "Enrollment_studentId_sessionId_key" ON "Enrollment"("studentId", "sessionId");
CREATE INDEX "Enrollment_schoolId_sessionId_classId_idx" ON "Enrollment"("schoolId", "sessionId", "classId");

CREATE TABLE "ClassSubject" (
  "id" SERIAL NOT NULL,
  "schoolId" INTEGER NOT NULL,
  "classId" INTEGER NOT NULL,
  "subjectId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassSubject_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClassSubject_classId_subjectId_key" ON "ClassSubject"("classId", "subjectId");

CREATE TABLE "ResultScore" (
  "id" BIGSERIAL NOT NULL,
  "schoolId" INTEGER NOT NULL,
  "enrollmentId" BIGINT NOT NULL,
  "termId" INTEGER NOT NULL,
  "subjectId" INTEGER NOT NULL,
  "firstTest" INTEGER,
  "secondTest" INTEGER,
  "exam" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResultScore_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ResultScore_enrollmentId_termId_subjectId_key" ON "ResultScore"("enrollmentId", "termId", "subjectId");

CREATE TABLE "TermSetup" (
  "id" SERIAL NOT NULL,
  "schoolId" INTEGER NOT NULL,
  "sessionId" INTEGER NOT NULL,
  "termId" INTEGER NOT NULL,
  "schoolOpened" INTEGER NOT NULL,
  "resumptionDate" TIMESTAMP(3),
  "reportTitle" TEXT NOT NULL DEFAULT 'CONTINUOUS ASSESSMENT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TermSetup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TermSetup_schoolId_sessionId_termId_key" ON "TermSetup"("schoolId", "sessionId", "termId");

CREATE TABLE "TermReport" (
  "id" BIGSERIAL NOT NULL,
  "schoolId" INTEGER NOT NULL,
  "enrollmentId" BIGINT NOT NULL,
  "termId" INTEGER NOT NULL,
  "timesPresent" INTEGER,
  "concentration" INTEGER,
  "schoolAttendance" INTEGER,
  "assignments" INTEGER,
  "punctuality" INTEGER,
  "classParticipation" INTEGER,
  "attitudeToProperty" INTEGER,
  "cleanliness" INTEGER,
  "generalConduct" INTEGER,
  "teacherRemark" TEXT,
  "principalRemark" TEXT,
  "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "publishedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TermReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TermReport_enrollmentId_termId_key" ON "TermReport"("enrollmentId", "termId");

ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id");
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id");
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id");
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id");
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classes"("Id");
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classes"("Id");
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subjects"("Id");
ALTER TABLE "ResultScore" ADD CONSTRAINT "ResultScore_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id");
ALTER TABLE "ResultScore" ADD CONSTRAINT "ResultScore_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subjects"("Id");
ALTER TABLE "TermSetup" ADD CONSTRAINT "TermSetup_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id");
ALTER TABLE "TermReport" ADD CONSTRAINT "TermReport_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id");
ALTER TABLE "TermReport" ADD CONSTRAINT "TermReport_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id");
