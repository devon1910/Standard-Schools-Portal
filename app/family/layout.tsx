import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student and Guardian Reports",
  robots: { index: false, follow: false },
};

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
