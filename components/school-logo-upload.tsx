"use client";

import { ImagePlus } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeSchoolLogo, saveSchoolLogo } from "@/app/actions/admin";
import SchoolLogo from "@/components/school-logo";
import { showToast } from "@/components/toast";

export default function SchoolLogoUpload({ logoUrl, schoolName }: { logoUrl: string | null; schoolName: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function reportError(cause: unknown) {
    const message = cause instanceof Error ? cause.message : "The logo could not be saved. Please try again.";
    setError(message);
    showToast({ type: "error", title: "Logo not saved", message });
  }

  function chooseLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Permit selecting the same file again after an invalid selection or failed upload.
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("Choose a JPG, PNG, or WebP image.");
    if (!file.size || file.size > 5 * 1024 * 1024) return setError("Choose an image that is no larger than 5 MB.");
    setError("");
    startTransition(async () => {
      try {
        const signedResponse = await fetch("/api/uploads/sign", {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "school-logo" }),
        });
        if (!signedResponse.ok) throw new Error("The logo upload could not start. Please try again later.");
        const signed = await signedResponse.json();
        const upload = new FormData();
        upload.set("file", file);
        upload.set("api_key", signed.apiKey);
        upload.set("timestamp", String(signed.timestamp));
        upload.set("signature", signed.signature);
        upload.set("folder", signed.folder);
        upload.set("allowed_formats", signed.allowed_formats);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, { method: "POST", body: upload });
        if (!response.ok) throw new Error("The logo upload failed. Please try again.");
        const uploaded = await response.json();
        await saveSchoolLogo({ publicId: uploaded.public_id, version: uploaded.version, format: uploaded.format, signature: uploaded.signature });
        router.refresh();
        showToast({ type: "success", title: "School logo saved", message: "The logo now appears in the portal and on report cards." });
      } catch (cause) { reportError(cause); }
    });
  }

  function removeLogo() {
    setError("");
    startTransition(async () => {
      try {
        await removeSchoolLogo();
        router.refresh();
        showToast({ type: "success", title: "School logo removed", message: "The default logo is now in use." });
      } catch (cause) { reportError(cause); }
    });
  }

  return <div className="school-logo-upload" role="group" aria-label="School logo">
    <SchoolLogo logoUrl={logoUrl} schoolName={schoolName} />
    <div className="school-logo-controls">
      <div className="header-actions">
        <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose school logo" disabled={pending} onChange={chooseLogo} />
        <button className="button button-secondary" type="button" disabled={pending} aria-busy={pending} onClick={() => inputRef.current?.click()}><ImagePlus size={16} />{pending ? "Saving logo..." : logoUrl ? "Replace logo" : "Upload logo"}</button>
        {logoUrl && <button className="button button-quiet" type="button" disabled={pending} onClick={removeLogo}>Remove logo</button>}
      </div>
      <p className="small muted">JPG, PNG, or WebP. Up to 5 MB. The logo is saved when the upload completes.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  </div>;
}
