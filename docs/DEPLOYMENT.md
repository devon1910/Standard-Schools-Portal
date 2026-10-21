# Production deployment

GitHub Actions runs the production release from [`.github/workflows/production.yml`](../.github/workflows/production.yml).

The workflow runs after a push to `main`. You can also select **Actions → Production migrations and deployment → Run workflow** on `main`.

It installs the locked dependencies, runs lint, checks types, and runs the tests. It also checks the full migration sequence on a disposable PostgreSQL 17 service. It then starts the production deployment on Vercel. The production build runs `npm run db:migrate` before `npm run build`, using Vercel's production `DATABASE_URL`. The application goes live only after both commands pass.

The migration and running application use the same Vercel database setting. The workflow does not use a separate GitHub `DATABASE_URL` secret. This prevents a migration from succeeding against a different database while the deployed application still has missing columns.

Only one production release can run at a time. A new push does not cancel a running migration. The workflow rejects a commit that is already behind `main` before it changes the database.

## Configure GitHub once

In the repository, open **Settings → Environments**. Create an environment named `production`. Add these environment secrets:

| Secret | Value |
| --- | --- |
| `VERCEL_TOKEN` | A Vercel access token that can deploy the existing project. |
| `VERCEL_ORG_ID` | The Vercel team or account ID for the project. |
| `VERCEL_PROJECT_ID` | The ID of the existing Vercel project. |

Repository secrets with the same names also work. Environment secrets take priority. Do not put secret values in the workflow file.

Use the existing Vercel project. Run `vercel link` locally if you need its IDs. Read `orgId` and `projectId` from the generated `.vercel/project.json`. This folder is ignored by Git. Keep `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, Cloudinary settings, and other application variables in Vercel. The database connection must allow schema changes.

Set these secrets before you push the workflow to `main`. Then check the first run in the repository's **Actions** tab. Vercel's build logs show `Applied:` for each new migration and `Already applied:` for each completed migration.

## Coordinate with Vercel

[`vercel.json`](../vercel.json) disables Vercel's automatic Git deployment for `main`. GitHub Actions starts that branch's release after checks pass. The production build command applies migrations before building the application. Automatic preview deployments on other branches keep their existing behavior and skip production migrations. The production workflow does not run for pull requests or preview branches.

Set Vercel's production branch to `main`. Keep the project connected to the repository. The CLI deployment uses the project IDs from GitHub and builds the code on Vercel.

## Migration behavior

The workflow uses the existing migration runner in `prisma/deploy.ts`. It reads the checked-in SQL files in folder-name order. Each pending migration runs in a transaction. The runner records completed migrations in `_prisma_migrations` and skips them on later runs.

If a migration fails, the runner rolls back that migration and exits with an error. Vercel stops the build and keeps the previous deployment live. Earlier completed migrations remain recorded. Correct the cause and rerun the workflow. Do not edit SQL files that have already been applied; add a new migration for the next change.

This workflow does not reset the database, run the legacy backfill, or seed accounts. A database that still needs the initial legacy cutover must first follow [the migration guide](../prisma/migrations/README.md).

For an empty database, the `20260823_create_legacy_tables` prerequisite creates the base tables before the rewrite migration changes them. For an existing database, it preserves the legacy tables and rows. It rejects partial or unrelated schemas and points to the connection or schema setting that needs attention.

If a run failed with `relation "Classes" does not exist`, push this fix and run the workflow for the latest `main` commit. The failed rewrite was rolled back and can be retried. If the connection is meant to use existing school records, first confirm that GitHub's `DATABASE_URL` matches Vercel's database.

## Local migration checks

Create a disposable PostgreSQL database whose name ends in `_test`. Set `MIGRATION_TEST_DATABASE_URL` to its connection string, then run `npm run test:migrations`. The checks create temporary schemas and remove them when finished. They never fall back to the production `DATABASE_URL`.

These checks reproduce the original missing-table failure, then test a clean deployment, repeat deployment, legacy data preservation, and an already upgraded database. They also test partial, unrelated, and incorrectly selected schemas. GitHub runs the same checks before production migrations.

For the new student ID and family portal code, the pending updates are `20261021_student_ids` and `20261022_family_portal`. The workflow applies them if the database history does not already mark them complete.

## References

- [GitHub environment secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- [GitHub workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- [Vercel deployment with GitHub Actions](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel)
- [Vercel automatic Git deployment settings](https://vercel.com/docs/project-configuration/git-configuration)
