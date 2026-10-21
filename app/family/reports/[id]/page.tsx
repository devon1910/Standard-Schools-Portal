import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFamilyUser } from "@/lib/auth";
import { getFamilyReport } from "@/lib/family-reports";
import ReportCard from "@/components/report-card";
import PrintButton from "@/components/print-button";

export default async function FamilyReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireFamilyUser();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const result = await getFamilyReport(user.schoolId, BigInt(user.studentProfileId), BigInt(id));
  if (!result) notFound();
  return <main className="family-report-page">
    <div className="family-report-toolbar no-print"><Link className="button button-secondary" href="/family">Back to report cards</Link><p className="small muted">Use Print to print a copy or save it as a PDF.</p><PrintButton /></div>
    <div className="family-report-scroll"><ReportCard data={result.data} student={result.student} /></div>
  </main>;
}
