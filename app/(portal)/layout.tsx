import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { LogoutButton, NavigationLinks } from "@/components/portal-nav";
import { db } from "@/lib/db";
import { getCurrentSessionId } from "@/lib/current-session";
import SessionSelector from "@/components/session-selector";
import ToastViewport from "@/components/toast";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/change-password");
  const sessions = await db.legacySession.findMany({ where: { schoolId: user.schoolId }, orderBy: { id: "desc" }, select: { id: true, name: true } });
  const currentSessionId = await getCurrentSessionId(user.schoolId, sessions);
  return <div className="app-shell"><aside className="sidebar"><div className="brand-lockup"><strong>{user.schoolName}</strong><span>Administration portal</span></div><NavigationLinks /><div className="sidebar-footer"><p>{user.name}</p><small>{user.role.toLowerCase()}</small><br /><LogoutButton /></div></aside><div className="workspace"><header className="topbar"><div className="topbar-title"><h1>{user.schoolName}</h1><p>School operations and academic records</p></div><div className="topbar-actions"><SessionSelector sessions={sessions} currentSessionId={currentSessionId} /><span className="role-chip">{user.role}</span></div></header><NavigationLinks mobile /><main className="main-content">{children}</main><Suspense><ToastViewport /></Suspense></div></div>;
}
