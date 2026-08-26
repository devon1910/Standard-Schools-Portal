"use client";

import { useFormStatus } from "react-dom";
import { useEffect, useRef } from "react";
import { showToast } from "@/components/toast";

export default function SubmitButton({
  children,
  pendingLabel = "Saving...",
  className = "button button-primary",
  disabled = false,
  successMessage = "Your changes were saved.",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
  successMessage?: string;
}) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) wasPending.current = true;
    if (!pending && wasPending.current) {
      wasPending.current = false;
      showToast({ type: "success", title: "Action completed", message: successMessage });
    }
  }, [pending, successMessage]);

  return (
    <button
      className={className}
      disabled={disabled || pending}
      aria-busy={pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
