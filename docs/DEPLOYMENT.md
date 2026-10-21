# Production deployment

GitHub Actions runs the production release from [`.github/workflows/production.yml`](../.github/workflows/production.yml).

The workflow runs after a push to `main`. You can also select **Actions → Production migrations and deployment → Run workflow** on `main`.

It installs the locked dependencies, runs lint, checks types, and runs the tests. It then runs `npm run db:migrate`. Deployment to Vercel starts only if all earlier steps pass. Vercel builds the application with its existing production environment settings.

Only one production release can run at a time. A new push does not cancel a running migration. The workflow rejects a commit that is already behind `main` before it changes the database.

## Configure GitHub once

In the repository, open **Settings → Environments**. Create an environment named `production`. Add these environment secrets:

| Secret | Value |
| --- | --- |
| `DATABASE_URL` | Connection string for the production database used by this Vercel project. It must allow schema changes. A direct PostgreSQL connection is preferred. |
| `VERCEL_TOKEN` | A Vercel access token that can deploy the existing project. |
| `VERCEL_ORG_ID` | The Vercel team or account ID for the project. |
| `VERCEL_PROJECT_ID` | The ID of the existing Vercel project. |

Repository secrets with the same names also work. Environment secrets take priority. Do not put secret values in the workflow file.

Use the existing Vercel project. Run `vercel link` locally if you need its IDs. Read `orgId` and `projectId` from the generated `.vercel/project.json`. This folder is ignored by Git. Keep `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, Cloudinary settings, and other application variables in Vercel.

Set these secrets before you push the workflow to `main`. Then check the first run in the repository's **Actions** tab. A successful migration step logs `Applied:` for each new migration and `Already applied:` for each completed migration.

## Coordinate with Vercel

[`vercel.json`](../vercel.json) disables Vercel's automatic Git deployment for `main`. GitHub Actions deploys that branch after migrations pass. This prevents an automatic Vercel deployment from starting before the database is ready. Automatic preview deployments on other branches keep their existing behavior. The production migration workflow does not run for pull requests or preview branches.

Set Vercel's production branch to `main`. Keep the project connected to the repository. The CLI deployment uses the project IDs from GitHub and builds the code on Vercel.

## Migration behavior

The workflow uses the existing migration runner in `prisma/deploy.ts`. It reads the checked-in SQL files in folder-name order. Each pending migration runs in a transaction. The runner records completed migrations in `_prisma_migrations` and skips them on later runs.

If a migration fails, the runner rolls back that migration and exits with an error. GitHub does not start the Vercel deployment. Earlier completed migrations remain recorded. Correct the cause and rerun the workflow. Do not edit SQL files that have already been applied; add a new migration for the next change.

This workflow does not reset the database, run the legacy backfill, or seed accounts. A database that still needs the initial legacy cutover must first follow [the migration guide](../prisma/migrations/README.md).

For the new student ID and family portal code, the pending updates are `20261021_student_ids` and `20261022_family_portal`. The workflow applies them if the database history does not already mark them complete.

## References

- [GitHub environment secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- [GitHub workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- [Vercel deployment with GitHub Actions](https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel)
- [Vercel automatic Git deployment settings](https://vercel.com/docs/project-configuration/git-configuration)
