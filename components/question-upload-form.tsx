"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuestion } from "@/app/actions/questions";
import { showToast } from "@/components/toast";

type Item = { id: number; name: string };

export default function QuestionUploadForm({ defaultSessionId, sessions, terms, classes, subjects }: { defaultSessionId?: number; sessions: Item[]; terms: Item[]; classes: Array<Item & { sessionId: number }>; subjects: Array<Item & { classTypeId: number }> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState(defaultSessionId ?? sessions[0]?.id ?? 0);
  const visibleClasses = useMemo(() => classes.filter((item) => item.sessionId === sessionId), [classes, sessionId]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file") as File;
    if (!file || file.size === 0) return setError("Choose a file to upload.");
    if (file.size > 10 * 1024 * 1024) return setError("Files must be 10 MB or smaller.");
    setError("");
    startTransition(async () => {
      try {
        const signed = await fetch("/api/uploads/sign", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "question" }) }).then((response) => response.json());
        const upload = new FormData();
        upload.set("file", file); upload.set("api_key", signed.apiKey); upload.set("timestamp", String(signed.timestamp)); upload.set("signature", signed.signature); upload.set("folder", signed.folder);
        const resourceType = file.type.startsWith("image/") ? "image" : "raw";
        const uploaded = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/${resourceType}/upload`, { method: "POST", body: upload }).then(async (response) => { if (!response.ok) throw new Error("File upload failed."); return response.json(); });
        await createQuestion({ sessionId, termId: Number(form.get("termId")), classId: Number(form.get("classId")), subjectId: Number(form.get("subjectId")), type: form.get("type"), questionUrl: uploaded.secure_url, filePublicId: uploaded.public_id });
        router.refresh();
        showToast({ type: "success", title: "Question uploaded", message: "The file is now available in the question bank." });
      } catch (cause) { const message = cause instanceof Error ? cause.message : "Upload failed."; setError(message); showToast({ type: "error", title: "Upload failed", message }); }
    });
  }

  return <form onSubmit={submit} className="form-grid">{error && <div className="notice error field full">{error}</div>}<div className="field"><label>Session</label><select className="select" value={sessionId} onChange={(event) => setSessionId(Number(event.target.value))}>{sessions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field"><label>Term</label><select className="select" name="termId">{terms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field"><label>Class</label><select className="select" name="classId">{visibleClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field"><label>Subject</label><select className="select" name="subjectId">{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field"><label>Assessment type</label><select className="select" name="type"><option>CA</option><option>Exam</option></select></div><div className="field"><label>File</label><input className="input" name="file" type="file" accept="image/*,.pdf,.doc,.docx" required /></div><button className="button button-primary field full" aria-busy={pending} disabled={pending}>{pending ? "Uploading…" : "Upload question"}</button></form>;
}
