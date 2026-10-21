"use client";

import { useState, useTransition } from "react";
import { publishClassReports, unpublishClassReports } from "@/app/actions/results";
import { showToast } from "@/components/toast";

export default function ReportPublishButton({ classId, termId }: { classId: number; termId: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function publish(withdraw = false) {
    startTransition(async () => {
      setError("");
      try {
        if (withdraw) await unpublishClassReports(classId, termId);
        else await publishClassReports(classId, termId);
        showToast({ type: "success", title: withdraw ? "Reports withdrawn" : "Reports published", message: withdraw ? "These reports are hidden from student and guardian accounts." : "Completed report cards in this class are now available to students and guardians." });
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Could not publish reports.";
        setError(message);
        showToast({ type: "error", title: "Could not publish reports", message });
      }
    });
  }

  return <div className="header-actions" style={{ flexWrap: "wrap" }}>{error && <span className="small" style={{ color: "var(--danger)" }}>{error}</span>}<button type="button" className="button button-primary" aria-busy={pending} disabled={pending} onClick={() => publish()}>{pending ? "Updating..." : "Publish class reports"}</button><button type="button" className="button button-secondary" disabled={pending} onClick={() => publish(true)}>Withdraw class reports</button></div>;
}
