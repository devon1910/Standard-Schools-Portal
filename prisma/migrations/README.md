# Existing database migration

This application adopts the populated PostgreSQL database created by the retired .NET API.

1. Back up production and restore it to a staging database.
2. Run `npx prisma db pull` only for comparison; do not overwrite the reviewed schema mappings.
3. Create a baseline from the current production schema and mark it applied with `prisma migrate resolve --applied 0_legacy_baseline`.
4. Review and deploy `20260824_fullstack_rewrite/migration.sql` against staging.
5. Run `prisma/backfill.ts`, review conflicts, then repeat during the production maintenance window.

The migration is additive. The legacy `Students` and ASP.NET Identity tables are not removed.

`20261021_student_ids` adds the school ID format and the generated student ID field. It leaves all existing student identifiers unchanged. After deployment, each school owner must set the ID format in Settings before staff add or import students. The database locks the format after the first save. New IDs are allocated under a school row lock in the same transaction as student creation.
