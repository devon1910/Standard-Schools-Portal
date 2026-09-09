"use client";

import { Camera } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStudentPhoto } from "@/app/actions/admin";
import { showToast } from "@/components/toast";

export default function StudentPhotoUpload({ studentId, studentName }: { studentId: string; studentName: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Choose an image file.");
    if (file.size > 5 * 1024 * 1024) return setError("Passport photographs must be 5 MB or smaller.");

    setError("");
    startTransition(async () => {
      try {
        const signedResponse = await fetch("/api/uploads/sign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind: "student-photo" }),
        });
        if (!signedResponse.ok) throw new Error("Could not prepare the photo upload.");
        const signed = await signedResponse.json();
        const upload = new FormData();
        upload.set("file", file);
        upload.set("api_key", signed.apiKey);
        upload.set("timestamp", String(signed.timestamp));
        upload.set("signature", signed.signature);
        upload.set("folder", signed.folder);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, { method: "POST", body: upload });
        if (!response.ok) throw new Error("Photo upload failed.");
        const uploaded = await response.json();
        await updateStudentPhoto({ studentId, photoUrl: uploaded.secure_url, photoPublicId: uploaded.public_id });
        router.refresh();
        showToast({ type: "success", title: "Passport photo saved", message: `${studentName}'s photo will now appear on report cards.` });
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Photo upload failed.";
        setError(message);
        showToast({ type: "error", title: "Upload failed", message });
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  return (
    <div className="student-photo-control">
      <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} disabled={pending} />
      <button className="button button-secondary" type="button" onClick={() => inputRef.current?.click()} disabled={pending}>
        <Camera size={16} />{pending ? "Uploading…" : "Upload passport photo"}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
