"use client";

import { useState, useTransition } from "react";
import { publishClassReports } from "@/app/actions/results";
import { showToast } from "@/components/toast";

export default function ReportPublishButton({ classId, termId }: { classId: number; termId: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function publish() {
    startTransition(async () => {
      setError("");
      try {
        await publishClassReports(classId, termId);
        showToast({ type: "success", title: "Reports published", message: "Completed report cards in this class are now published." });
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Could not publish reports.";
        setError(message);
        showToast({ type: "error", title: "Could not publish reports", message });
      }
    });
  }

  return <div>{error && <span className="small" style={{ color: "var(--danger)" }}>{error}</span>} <button type="button" className="button button-primary" aria-busy={pending} disabled={pending} onClick={publish}>{pending ? "Checking..." : "Publish class reports"}</button></div>;
}
