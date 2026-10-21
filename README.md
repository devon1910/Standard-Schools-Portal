# Standard Schools Portal

A multi-tenant school administration SaaS built with Next.js. Each school operates in its own private workspace, with isolated users, students, academic records, settings, and files. The application replaces the former Vite frontend and .NET API with one deployable service while continuing to use PostgreSQL and Cloudinary.

For simple instructions on using the portal, see the [Portal User Guide](USER_GUIDE.md).

## School onboarding

Existing school owners and staff sign in through the public login page. A prospective school can select **Contact us** there to open a pre-addressed account enquiry, including prompts for the school name, contact name, and phone number.

To request a workspace directly, email [davidsonekpokpobe@gmail.com](mailto:davidsonekpokpobe@gmail.com?subject=Standard%20Schools%20Portal%20%E2%80%94%20School%20Account%20Enquiry).

## What is included

- School-isolated owner and staff accounts with temporary-password rotation and login lockout.
- Password audit trail in Settings for school owners. Records account creation, password changes, and resets with actor and time. See [Password audit trail](docs/PASSWORD_AUDIT.md).
- Permanent student profiles with session-based enrollments and term fee tracking.
- System-generated student IDs with a school prefix and number width set once in Settings. New records need no admission number. Existing identifiers stay unchanged.
- Transactional bulk student import from Word (.docx), Excel, or CSV, with Word and Excel templates, preview, and validation. Only first name, last name, class, gender, and date of birth are required. Class names match classes in the selected session. Save older .doc files as .docx before importing.
- Guided session setup and bulk promotion, including left-school and graduated outcomes.
- Sessions, classes, class categories, subjects, and a signed-upload question bank.
- Class-wide subject configuration and spreadsheet-style 20/20/60 score sheets.
- Attendance, behaviour ratings, teacher/principal remarks, result validation and publishing.
- Individual or class-batch A4 report cards based on the supplied reference document.
- Student and guardian report portal at `/family`, with owner-issued credentials, required password changes, account disable/reset, and access to only the linked student's published reports. An optional `FAMILY_PORTAL_URL` enables a dedicated subdomain on the same deployment. See [Report portal setup](docs/FAMILY_PORTAL.md).

## Local setup

1. Use Node.js 24 or a supported current LTS release.
2. Copy `.env.example` to `.env.local` and supply a development PostgreSQL database, NextAuth secret, and Cloudinary credentials.
3. Install and generate the client:

   ```powershell
   npm install
   npm run db:generate
   ```

4. Run `npm run db:migrate` for an empty database. For an existing database, follow [prisma/migrations/README.md](prisma/migrations/README.md). Never run a reset against production.
5. Seed the development schools and temporary accounts after setting the four `SEED_*_PASSWORD` variables:

   ```powershell
   npm run db:seed
   ```

6. Start the portal:

   ```powershell
   npm run dev
   ```

## Production migration and cutover

1. Take a `pg_dump` backup and restore it to staging.
2. Mark `0_legacy_baseline` as applied, deploy the additive rewrite migration, and run `npx tsx prisma/backfill.ts`.
3. Resolve every duplicate-admission conflict reported by the backfill. Verify legacy row, enrollment, profile, question and class counts.
4. Run owner/staff acceptance testing on staging.
5. During a short maintenance window, back up production again, deploy the migration, run the backfill and seed reset accounts.
6. Deploy to Vercel with a pooled `DATABASE_URL`. Keep the .NET deployment disabled but recoverable for 30 days.

The migration never drops the legacy `Students` or ASP.NET Identity tables. Rollback therefore remains possible, although records created after cutover must be reconciled before reverting.

## Ongoing production releases

GitHub Actions checks changes pushed to `main` and starts the production deployment on Vercel. The Vercel production build applies pending migrations with the same `DATABASE_URL` as the running application before it builds the code. A failed migration stops the release. Production releases run one at a time. Vercel's automatic Git deployment for `main` is disabled so it cannot deploy ahead of the pipeline.

Configure the `production` GitHub environment with `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` before pushing this workflow. Keep the production `DATABASE_URL` in Vercel. See [deployment setup](docs/DEPLOYMENT.md) for the steps and manual reruns.

## Quality checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Playwright smoke tests use `PLAYWRIGHT_BASE_URL` or default to `http://127.0.0.1:3000`.

## Permission summary

- **Owner:** school settings, users, academic structure, promotion, fees, archival, score entry, report details and publishing.
- **Staff:** students, question files, score entry, draft report details, previews and printing.
- **Student or guardian:** the linked student's published report cards and their own password. One account is issued per student.

Every query and Server Action independently checks the authenticated school. Student accounts cannot use staff pages or actions. Password resets and account disabling invalidate current sessions. There is no public report lookup.
