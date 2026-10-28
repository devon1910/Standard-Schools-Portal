# Database migrations

## New database

Run `npm run db:migrate` against an empty PostgreSQL database. The `20260823_create_legacy_tables` prerequisite creates the seven tables whose names the application retains from the former .NET service. It runs before the rewrite migration adds `archivedAt` and foreign keys to those tables. The original baseline marker and previously applied SQL files stay unchanged.

After migration, use `npm run db:seed` with the documented `SEED_*_PASSWORD` values to create the first owner and staff accounts. Migrations do not create login credentials.

## Existing database

This application adopts the populated PostgreSQL database created by the retired .NET API.

1. Back up production and restore it to a staging database.
2. Run `npx prisma db pull` only for comparison; do not overwrite the reviewed schema mappings.
3. Create a baseline from the current production schema and mark it applied with `prisma migrate resolve --applied 0_legacy_baseline`.
4. Review and deploy `20260824_fullstack_rewrite/migration.sql` against staging.
5. Run `prisma/backfill.ts`, review conflicts, then repeat during the production maintenance window.

The migration is additive. The legacy `Students` and ASP.NET Identity tables are not removed.

When all seven legacy tables already exist, `20260823_create_legacy_tables` leaves them and their rows unchanged. This also applies to databases where the rewrite and later migrations have already completed.

## Missing table errors

An error such as `relation "Classes" does not exist` means the upgrade migration could not find a table previously assumed to exist. The prerequisite now supports empty databases. The runner rolls back a failed migration, so push the fix and rerun the production workflow on the latest `main` commit. Do not reset the database or mark the failed rewrite as applied.

If only some legacy tables exist, if unrelated tables occupy the target schema, or if the school tables exist in another schema, the prerequisite stops with a configuration error. Check Vercel's production `DATABASE_URL` and confirm that PostgreSQL `search_path` selects the schema containing the school tables. Restore missing legacy tables when necessary. The prerequisite does not create empty replacements beside partial school data.

## Later updates

`20261021_student_ids` adds the school ID format and the generated student ID field. It leaves all existing student identifiers unchanged. Schools without a custom prefix now use the existing year/admission-class/number format, with at least five number digits. No setup or further migration is required. Settings can set an optional custom prefix for future students; the database locks it after the first save. Existing custom prefixes remain in use. New IDs are allocated under a school row lock in the same transaction as student creation. Allocation checks both profile identifiers and legacy admission numbers. The stored counter prevents reuse of generated numbers after deletion.

`20261022_family_portal` adds the student account role, its profile link, and a session version for credential revocation. It creates no accounts and changes no existing credentials. Student accounts are deleted with their student profile. Deploy both migrations with `npm run db:migrate` before deploying the new application. See [Report portal setup](../../docs/FAMILY_PORTAL.md).

GitHub Actions starts each production release. Vercel then runs `npm run db:migrate` with its production `DATABASE_URL` before building the application. Configure the production secrets with [the deployment guide](../../docs/DEPLOYMENT.md). Completed migrations are skipped. A failed migration stops the release.

`20261023_password_audit` adds password event history and database triggers. It does not change existing passwords or create past events. Every new account and password hash change creates an event in the same transaction. Account deletion keeps the history. Update, delete, and truncate operations on the audit table are rejected. Deploy this migration before the code that supplies the actor context. See [Password audit trail](../../docs/PASSWORD_AUDIT.md).

`20261028_enrollment_class_scope` requires each enrollment's class ID, school ID, and session ID to match one class row. It also prevents a class edit from invalidating existing enrollments. It replaces the class-ID-only foreign key with a composite foreign key; no student records are changed or deleted. The migration rejects existing mismatches and must run after those records have been repaired. Its time limits are set inside the migration transaction for compatibility with pooled connections.
