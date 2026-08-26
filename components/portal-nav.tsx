"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { BookOpen, ClipboardCheck, GraduationCap, LayoutDashboard, Library, LogOut, School, Settings, Users } from "lucide-react";

const items = [
  ["Overview", "/dashboard", LayoutDashboard],
  ["Students", "/students", Users],
  ["Academics", "/academics", School],
  ["Promotion", "/promotion", GraduationCap],
  ["Question bank", "/questions", Library],
  ["Score sheets", "/results", ClipboardCheck],
  ["Report cards", "/reports", BookOpen],
  ["Settings", "/settings", Settings],
] as const;

export function NavigationLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return <nav className={mobile ? "mobile-nav" : "nav-list"}>{items.map(([label, href, Icon]) => <Link key={href} href={href} className={mobile ? "" : `nav-link ${pathname.startsWith(href) ? "active" : ""}`}><Icon size={18} />{label}</Link>)}</nav>;
}

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  return (
    <button
      className="logout-button"
      disabled={pending}
      aria-busy={pending}
      onClick={() => {
        setPending(true);
        void signOut({ callbackUrl: "/login" });
      }}
    >
      <LogOut size={15} style={{ display: "inline", marginRight: 7 }} />
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}
