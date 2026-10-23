import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { LogoutButton, NavigationLinks } from "@/components/portal-nav";
import { db } from "@/lib/db";
import { getCurrentSessionId } from "@/lib/current-session";
import SessionSelector from "@/components/session-selector";
import ToastViewport from "@/components/toast";
import Image from "next/image";
import SchoolLogo from "@/components/school-logo";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/change-password");
  const sessions = await db.legacySession.findMany({ where: { schoolId: user.schoolId }, orderBy: { id: "desc" }, select: { id: true, name: true } });
  const currentSessionId = await getCurrentSessionId(user.schoolId, sessions);
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-lockup"><Image src="/brand/lockup-horizontal-inverse.svg" alt="Standard Schools" width={300} height={40} priority /><strong>{user.schoolName}</strong><span>Administration portal</span></div>
      <NavigationLinks />
      <div className="sidebar-footer"><p>{user.name}</p><small>{user.role.toLowerCase()}</small><br /><LogoutButton /></div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <div className="topbar-brand"><SchoolLogo logoUrl={user.schoolLogoUrl} schoolName={user.schoolName} /><div className="topbar-title"><h1>{user.schoolName}</h1><p>School operations and academic records</p></div></div>
        <div className="topbar-actions"><Suspense><SessionSelector sessions={sessions} currentSessionId={currentSessionId} /></Suspense><span className="role-chip">{user.role}</span><div className="mobile-account-actions"><LogoutButton /></div></div>
      </header>
      <NavigationLinks mobile />
      <main className="main-content">{children}</main>
      <Suspense><ToastViewport /></Suspense>
    </div>
  </div>;
}
