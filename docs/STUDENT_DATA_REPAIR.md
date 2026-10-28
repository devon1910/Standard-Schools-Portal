# Student data repair: school 1, session 3

Status: prepared for review. No live repair has been applied.

The read-only audit found 180 enrollments for Standard High School, 2025/2026, linked to classes from session 1. Each has one matching class in session 3. No scores, reports, or family accounts were linked to these affected enrollments at the time of review.

## 1. Correct the class links

Take a database backup before applying the manual SQL in [the repair file](../prisma/repairs/20261027_school1_session3_class_links.sql). Run it during a short pause in student entry, promotion, and score/report entry. It briefly locks the class, enrollment, score, and report tables against writes.

Preparation in this workspace is complete: a full database backup was saved to an ignored local archive and restored into a disposable local database. The repair was tested on that copy. It corrected 180 links while preserving all 485 enrollments, 484 profiles, and 510 legacy rows. These are whole-database totals, not just session 3 totals. Production has not been changed.

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

## 2. Recover unlinked legacy records after identity review

There are 26 unlinked legacy rows in this session. None has an exact name-and-date-of-birth match in the school's current profiles. Their class mappings are unambiguous. Shared admission numbers must not be treated as proof that these are the same student.

Review the original names, dates of birth, and admission records with the admin. Preserve every original `Students` row. For each confirmed separate student, create a separate profile and a session 3 enrollment linked through `legacyStudentId`. Copy that student's personal details and term fee values from the original row. Do not overwrite another profile or merge students to satisfy the admission-number uniqueness rule.

School 1 has not configured its generated student ID format. Set that format in Settings before assigning new IDs. Where an old admission number is already owned by a different student, retain it in the preserved legacy row; use the generated student ID for the new profile and leave its conflicting `admissionNumber` unset pending admin review.

The Basic 4 recovery candidates are legacy IDs 65, 67, 425, 426, and 492 for 4A, and 427 for 4B. If the admin confirms all six as separate students, the expected counts become 21 in 4A and 12 in 4B. Do not reimport the entire class: that creates additional profiles for students already present.

## 3. Prevent recurrence

Keep the backfill checks that reject class/session mismatches and conflicting identities. Do not rerun the old backfill to repair this data.

After correcting existing links, add a database foreign key that requires the enrollment's class, school, and session to match the same class row. This needs a unique key on `Classes(Id, SchoolId, SessionId)`. Check all schools before validating that constraint. The global read-only audit currently found these 180 enrollments as the only class/school/session mismatches.

Keep `StudentProfile` and `Enrollment` as the application's current data source. Retain `Students` for migration evidence and recovery; do not add writes to both designs.
