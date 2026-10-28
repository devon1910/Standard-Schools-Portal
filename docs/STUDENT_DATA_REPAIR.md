# Student data repair: school 1, session 3

Status: class-link repair applied to production on 2026-10-28 at 09:18 UTC, after user approval. The database guard was applied at 09:41 UTC. All 26 approved separate students were restored at 10:49 UTC. A new connection confirmed that every pre-existing profile, enrollment, and legacy row remained unchanged. Production now has 510 profiles, 511 enrollments, and 510 legacy rows. Basic 4A has 21 active students; Basic 4B has 12. No records were deleted.

The class-link transaction corrected exactly 180 class links. Before commit, row comparisons confirmed that enrollment IDs, student profiles, fee values, statuses, scores, reports, and legacy rows were preserved. A new connection then verified zero enrollment/class mismatches, 16 active enrollments in Basic 4A, and 11 in Basic 4B. At that stage, whole-database totals were 485 enrollments, 484 profiles, and 510 legacy rows. The later recovery added the 26 approved separate students. No records were deleted.

A fresh full backup was created before the repair: `.artifacts/school-database-before-approved-repair-2026-10-28T09-16-04-654Z.dump.local`. The execution receipt and post-commit audit are `.artifacts/enrollment-class-repair-applied.local` and `.artifacts/enrollment-class-repair-post-audit.local`. These private files are ignored by Git.

The pre-repair read-only audit found 180 enrollments for Standard High School, 2025/2026, linked to classes from session 1. Each had one matching class in session 3. No scores, reports, or family accounts were linked to these affected enrollments at the time of review.

## 1. Correct the class links

The manual SQL in [the repair file](../prisma/repairs/20261027_school1_session3_class_links.sql) has now been applied. Do not rerun it on this database. Its safeguards reject an already completed repair. The instructions below record the approved procedure: take a fresh backup and briefly pause student entry, promotion, and score/report entry. The transaction locks the class, enrollment, score, and report tables against writes.

During preparation, a full database backup was saved to an ignored local archive and restored into a disposable local database. The repair was tested on that copy. It corrected 180 links while preserving all 485 enrollments, 484 profiles, and 510 legacy rows. These are whole-database totals, not just session 3 totals. Production remained unchanged until the approved application recorded above.

Private local files are `.artifacts/school-database-backup-2026-10-27T13-44-54-131Z.dump.local`, `.artifacts/enrollment-class-repair-backup.local`, and `.artifacts/student-recovery-review.local`. They are ignored by Git. The archive is a full backup; the JSON enrollment export alone is not. Restore backups into a separate database for recovery review; do not replace the live database and discard newer entries.

| Class | Old class ID | Correct class ID | Enrollments |
| --- | ---: | ---: | ---: |
| Nursery 1A | 1 | 87 | 15 |
| Nursery 1B | 2 | 90 | 14 |
| Nursery 2A | 4 | 91 | 15 |
| Nursery 2B | 5 | 92 | 15 |
| Nursery 3A | 7 | 93 | 5 |
| Nursery 3B | 8 | 94 | 6 |
| Basic 1A | 10 | 95 | 12 |
| Basic 1B | 11 | 96 | 10 |
| Basic 2A | 13 | 97 | 9 |
| Basic 2B | 14 | 98 | 11 |
| Basic 3A | 16 | 99 | 16 |
| Basic 4A | 19 | 101 | 16 |
| Basic 4B | 20 | 102 | 11 |
| Basic 5B | 23 | 103 | 14 |
| Pre-Nursery | 86 | 88 | 11 |

The SQL changes only `Enrollment.classId` and `Enrollment.updatedAt`. It does not delete records or change student identities, fees, school IDs, session IDs, or legacy `Students` rows. It verifies the session, class names, class categories, unique mappings, and row counts before writing. It stops if scores or reports have appeared. Any failed check rolls back the transaction, including a failed post-update check. An already completed repair is rejected without further changes.

The second read-only review on 2026-10-28 confirmed that all 180 affected rows still match the saved export exactly. All 15 target classes have matching categories, and the affected enrollments still have no scores, reports, or family accounts. Take a fresh full backup immediately before applying the repair. Keep the preparation archive as a separate reference.

The repaired data will make 11 Pre-Nursery enrollments visible to promotion. The promotion level check must recognise `Pre-Nursery` and allow progression to Nursery 1. A regression test exposed this missing level during the second review, and the local code now handles it. Deploy that code change before asking the admin to promote those students. It does not require a database change.

After applying it, rerun:

```powershell
node --env-file=.env.local --import tsx prisma/audit-enrollments.ts 1 --session-id 3
```

Acceptance: 180 links corrected; enrollment and profile counts unchanged; no class/session mismatch in the session; Basic 4A shows 16 existing enrollments and Basic 4B shows 11.

## 2. Restore the 26 approved separate students

There are 26 unlinked legacy rows in this session. None has an exact name-and-date-of-birth match in the school's current profiles. Their class mappings are unambiguous. Shared admission numbers must not be treated as proof that these are the same student.

The user approved treating every row as a separate student. The recovery script preserves every original `Students` row and creates a separate profile and session 3 enrollment linked through `legacyStudentId`. It copies the original personal details and all three terms' fee values. It never overwrites another profile or merges students to satisfy the admission-number uniqueness rule.

The recovery script is `prisma/repairs/recover-school1-session3-students.ts`. It checks the exact 26 approved legacy IDs, requires one target class with the same name and category, and uses the existing student ID allocator. All inserts and the ID counter update share one transaction. Invalid admission details, ambiguous classes, or a partial failure cause rollback. Repeating a completed recovery does not create additional profiles or advance the ID counter.

The recovery passed on a local restore of the fresh production backup with the default admission ID format. It added 26 profiles and enrollments while preserving all existing profile, enrollment, and legacy data. The local test counts became 510 profiles, 511 enrollments, and 510 unchanged legacy rows, with Basic 4A at 21 and Basic 4B at 12. The verification receipt is `.artifacts/student-recovery-clone-verification.local`.

The full backup manifest is `.artifacts/student-recovery-final-backup.local`. It records the archive path and SHA-256 hash. The production execution and separate post-commit verification receipts are `.artifacts/student-recovery-applied.local` and `.artifacts/student-recovery-post-audit.local`. All are private local files ignored by Git. Production writes and preservation checks shared one transaction. Before commit, the checks confirmed zero class/session mismatches and zero unlinked session 3 legacy rows.

This is a one-off recovery, not an ongoing sync. Do not run it again after the admin intentionally deletes restored duplicates, because their preserved legacy rows would become recovery candidates again.

The command below records the completed recovery. Do not rerun it after intentional admin deletions:

```powershell
node --env-file=.env.local --import tsx prisma/repairs/recover-school1-session3-students.ts --apply
```

School 1 uses the existing `year/admission-class/number` format by default. No custom prefix was set. New numbers have at least five digits. Allocation reserves all current profile identifiers and legacy admission numbers, including recognizable class-code and padding variations. The stored school counter acts as a floor to prevent reuse after deletion; numbers can have gaps. Recovery takes the year and class code from a valid original admission number before other legacy metadata, because some dates and class-at-admission fields disagree. It preserves those original fields. Where the old admission number belongs to a different student, it remains in the preserved legacy row; the new profile has a unique generated student ID and its conflicting `admissionNumber` remains unset. Promotion does not change IDs. Existing configured custom prefixes continue to work for other schools.

The Basic 4 recovery rows are legacy IDs 65, 67, 425, 426, and 492 for 4A, and 427 for 4B. The verified counts after recovery are 21 in 4A and 12 in 4B. Do not reimport the entire class: that creates additional profiles for students already present. Deploy the allocator and form changes for future student entry; the production data recovery is already complete.

## 3. Prevent recurrence

Keep the backfill checks that reject class/session mismatches and conflicting identities. Do not rerun the old backfill to repair this data.

The validated production foreign key `Enrollment_classId_schoolId_sessionId_fkey` now requires the enrollment's class, school, and session to match the same class row. It uses a unique index on `Classes(Id, SchoolId, SessionId)` and rejects conflicting parent-class edits. Migration `20261028_enrollment_class_scope` applied successfully after confirming zero mismatches across all schools. Before/after hashes confirmed that enrollment, profile, legacy, class, score, and report rows were unchanged by this migration. Its receipt is `.artifacts/enrollment-class-scope-guard-applied.local`.

Keep `StudentProfile` and `Enrollment` as the application's current data source. Retain `Students` for migration evidence and recovery; do not add writes to both designs.
