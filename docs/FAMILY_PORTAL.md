# Student and guardian report portal

The report portal runs in the same Next.js application. It uses the existing account and report tables. It needs no separate service or deployment.

## Use the current Vercel deployment

1. Back up the database. Review the two additive migrations in `prisma/migrations/20261021_student_ids` and `prisma/migrations/20261022_family_portal`.
2. Configure the GitHub production environment using [the deployment guide](DEPLOYMENT.md).
3. Push to `main` or run the production workflow. It applies pending migrations before deploying to Vercel. Keep the current `NEXTAUTH_URL` and `NEXTAUTH_SECRET`. Leave `FAMILY_PORTAL_URL` empty.
4. Open `https://YOUR-PROJECT.vercel.app/family/login`.
5. As a school owner, open a student's profile and select **Create student login**. Give the displayed credentials and portal link to the student or guardian.

Each student has one account. A guardian can use that account. A guardian with several children uses each child's account separately. The system creates the username and a random temporary password. It stores only a password hash. The first sign-in requires a password change. Forgotten passwords are reset by the school owner.

Owners can create access for existing students without changing their identifiers. The generated student ID format is required only when adding or importing new students.

## Add a subdomain later

For example, use `reports.example.com` for families and keep the staff portal at its current address.

1. Add `reports.example.com` to **Settings → Domains** in the same Vercel project.
2. At the domain provider, add the DNS record shown by Vercel. Wait for Vercel to confirm the domain and HTTPS certificate.
3. Set `FAMILY_PORTAL_URL=https://reports.example.com` in that project's production environment.
4. Keep `NEXTAUTH_URL` set to the staff portal's canonical address. Keep `NEXTAUTH_SECRET` unchanged.
5. Redeploy the same project. Open `https://reports.example.com` and test sign-in, password change, report access, and sign-out.

Use the exact DNS values shown for your project. See [Vercel's domain setup guide](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

The subdomain root opens the report portal. `/login` and `/change-password` also open the family pages on that host. Direct `/family` links continue to work on the Vercel address and the subdomain. School owners see the configured subdomain in each student's access panel.

Set `FAMILY_PORTAL_URL` to an origin only. Do not add `/family` or another path. No wildcard domain or shared cookie domain is needed. Authentication redirects accept only the staff origin and the configured report origin. Authentication cookies remain scoped to the host where the user signs in.

For local subdomain checks, set `FAMILY_PORTAL_URL=http://reports.localhost:3000`, restart the server, and open that address. Keep `NEXTAUTH_URL=http://localhost:3000` for the staff portal.

## Report access

- Student accounts can read only the linked student's published reports in their school.
- Student accounts cannot open staff pages or call staff actions.
- Report list and detail requests both check the account, school, student link, and publication state.
- The same report card component serves staff and families. The browser's print dialog can save it as a PDF.
- Historical published reports remain available after withdrawal or graduation. Archived students cannot sign in.
- Owners can withdraw a class's reports. Score, report detail, class subject, and term report setting edits return affected reports to draft status. Owners must review and publish them again.
- Password resets and access changes invalidate current sessions. Deleted student profiles also remove their student account.

The application does not email or send credentials. The school gives them to families through its chosen private channel.
