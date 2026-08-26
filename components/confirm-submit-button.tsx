"use client";

import { useFormStatus } from "react-dom";

export default function ConfirmSubmitButton({ children, message, pendingLabel = "Working...", className = "button button-danger" }: { children: React.ReactNode; message: string; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending} aria-busy={pending} onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }}>{pending ? pendingLabel : children}</button>;
}
