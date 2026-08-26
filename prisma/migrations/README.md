# Existing database migration

This application adopts the populated PostgreSQL database created by the retired .NET API.

1. Back up production and restore it to a staging database.
2. Run `npx prisma db pull` only for comparison; do not overwrite the reviewed schema mappings.
3. Create a baseline from the current production schema and mark it applied with `prisma migrate resolve --applied 0_legacy_baseline`.
4. Review and deploy `20260824_fullstack_rewrite/migration.sql` against staging.
5. Run `prisma/backfill.ts`, review conflicts, then repeat during the production maintenance window.

The migration is additive. The legacy `Students` and ASP.NET Identity tables are not removed.
