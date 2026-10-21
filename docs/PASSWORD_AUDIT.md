# Password audit trail

School owners can open **Settings → View password audit trail**. Each owner can see only their school's events. Search by account username. Times use Africa/Lagos.

Each event records the account username, action, time, actor name, actor username, source, and database role. Names and IDs are saved as snapshots. Later account changes or deletion do not erase the history. The trail stores no passwords or password hashes.

| Source | Actor recorded |
| --- | --- |
| Account holder changes their own password | The signed-in account. |
| School owner creates an account or resets a student's password | The signed-in school owner. |
| `npm run db:seed` sets a password | `GITHUB_ACTOR`, the operating system username, or `Seed script`. This identifies the script context rather than a verified portal account. |
| First successful legacy sign-in creates a portal account | The legacy username whose password was verified. |
| Direct SQL or a script without application context | The PostgreSQL database role. The database cannot identify the human behind a shared connection. |

A database trigger records each new `PortalUser` account and each change to `PortalUser.passwordHash`. The password write and audit event share one transaction. If the event cannot be recorded, the password write fails. Failed password attempts and ordinary sign-in updates do not create password change events.

The application supplies actor context within the password transaction. The database checks that an account holder changes only their own password. It also checks that an owner belongs to the target school. The context clears when the transaction ends.

Update, delete, and truncate operations on the audit table are rejected. A database administrator with schema privileges can still remove these controls. This trail does not replace database access controls or backups.

Apply `20261023_password_audit` before deploying the application change. The production workflow does this before the Vercel build. History starts when the migration completes. Existing account timestamps cannot prove who changed a password in the past, so the migration creates no historical events.

The deployment workflow does not run the seed script. Running the seed script manually resets the configured accounts and revokes their current sessions. Its new password events appear in this trail.
