import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";

const PAGE_SIZE = 50;
const actions: Record<string, string> = {
  ACCOUNT_CREATED: "Account created",
  PASSWORD_CHANGED: "Password changed",
  PASSWORD_RESET: "Password reset",
  LEGACY_ACCOUNT_IMPORTED: "Legacy account imported",
};
const sources: Record<string, string> = {
  SELF_SERVICE: "Account holder", SCHOOL_OWNER: "School owner", SEED: "Seed script",
  LEGACY_MIGRATION: "Legacy sign-in", DATABASE: "Database operation",
};
const timestamp = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "medium", timeZone: "Africa/Lagos" });

export default async function PasswordAuditPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> }) {
  const owner = await requireOwner();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const requestedPage = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 100000) : 1;
  const where = { schoolId: owner.schoolId, ...(query ? { accountUsername: { contains: query, mode: "insensitive" as const } } : {}) };
  const [events, count] = await Promise.all([
    db.passwordAuditEvent.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.passwordAuditEvent.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return <>
    <Link className="back-link" href="/settings">Back to Settings</Link>
    <header className="page-header"><div><h2>Password audit trail</h2><p>See when account passwords were set or changed and who made each change. Times use Africa/Lagos.</p></div></header>
    <p className="notice info">History starts when password auditing is enabled. Earlier changes cannot be reconstructed from account timestamps. Passwords and password hashes are never stored in this trail.</p>
    <form className="filter-bar card"><label className="field search">Account username<input className="input" name="q" defaultValue={query} placeholder="Find an account" /></label><button className="button button-secondary">Search</button></form>
    <section className="card"><div className="table-wrap"><table className="table"><thead><tr><th>Time</th><th>Account</th><th>Action</th><th>Changed by</th><th>Source</th></tr></thead><tbody>
      {events.map((event) => <tr key={event.id.toString()}><td>{timestamp.format(event.createdAt)}</td><td>{event.accountUsername}</td><td>{actions[event.action] ?? event.action}</td><td><strong>{event.actorName}</strong>{event.actorName !== event.actorUsername && <div className="small muted">{event.actorUsername}</div>}</td><td>{sources[event.source] ?? event.source}</td></tr>)}
      {!events.length && <tr><td colSpan={5} className="empty">No password events found.</td></tr>}
    </tbody></table></div></section>
    <footer className="page-header" style={{ marginTop: 16 }}><p className="small muted">Page {page} of {pages} · {count} events</p><div className="header-actions">
      {page > 1 && <Link className="button button-secondary" href={`?q=${encodeURIComponent(query)}&page=${page - 1}`}>Previous</Link>}
      {page < pages && <Link className="button button-secondary" href={`?q=${encodeURIComponent(query)}&page=${page + 1}`}>Next</Link>}
    </div></footer>
  </>;
}
