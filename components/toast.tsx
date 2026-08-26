"use client";

import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type ToastType = "success" | "error";
type ToastDetail = { type: ToastType; title: string; message?: string };
const eventName = "portal:toast";

const queryMessages: Record<string, ToastDetail> = {
  "session-exists": { type: "error", title: "Session already exists", message: "Choose a different session name." },
  "invalid-selection": { type: "error", title: "Invalid selection", message: "Review the selected options and try again." },
  "class-exists": { type: "error", title: "Class already exists", message: "Use a different class name for this session." },
  "subject-exists": { type: "error", title: "Subject already exists", message: "That subject is already configured for this class category." },
  "invalid-class": { type: "error", title: "Class unavailable", message: "Choose a class from the selected session." },
  "admission-exists": { type: "error", title: "Admission number already exists", message: "Open the existing student record or use a different admission number." },
  "session-created": { type: "success", title: "Session structure ready", message: "Review the students and choose who should continue into the new session." },
  "student-archived": { type: "success", title: "Student archived", message: "The student is hidden from active lists, while their history is retained." },
};

export function showToast(detail: ToastDetail) {
  window.dispatchEvent(new CustomEvent<ToastDetail>(eventName, { detail }));
}

export default function ToastViewport() {
  const [toast, setToast] = useState<(ToastDetail & { id: number }) | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    function receive(event: Event) {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      setToast({ ...detail, id: Date.now() });
    }
    window.addEventListener(eventName, receive);
    return () => window.removeEventListener(eventName, receive);
  }, []);

  useEffect(() => {
    const code = searchParams.get("error") ?? searchParams.get("toast");
    if (!code || !queryMessages[code]) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("error");
    next.delete("toast");
    const timer = window.setTimeout(() => {
      setToast({ ...queryMessages[code], id: Date.now() });
      router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;
  const Icon = toast.type === "success" ? CheckCircle2 : CircleAlert;
  return <div className={`toast toast-${toast.type}`} role={toast.type === "error" ? "alert" : "status"} aria-live="polite"><Icon size={20} /><div><strong>{toast.title}</strong>{toast.message && <p>{toast.message}</p>}</div><button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={17} /></button></div>;
}
