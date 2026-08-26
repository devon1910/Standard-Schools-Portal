"use client";

import { useTransition } from "react";
import { archiveQuestion } from "@/app/actions/questions";
import { showToast } from "@/components/toast";

export default function QuestionActions({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();

  function archive() {
    if (!window.confirm("Archive this question file? It will be hidden from the question bank, but its record will be retained.")) return;
    startTransition(async () => {
      try {
        await archiveQuestion(id);
        showToast({ type: "success", title: "Question archived", message: "The question file is no longer shown in the active bank." });
      } catch (cause) {
        showToast({ type: "error", title: "Could not archive question", message: cause instanceof Error ? cause.message : "Try again." });
      }
    });
  }

  return <button type="button" className="button button-danger" aria-busy={pending} disabled={pending} onClick={archive}>{pending ? "Archiving..." : "Archive"}</button>;
}
