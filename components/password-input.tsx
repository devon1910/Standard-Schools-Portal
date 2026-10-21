"use client";

import { useId, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({ id, className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const label = visible ? "Hide password" : "Show password";

  return <div className="password-input">
    <input {...props} id={inputId} className={`input password-input-control ${className ?? ""}`} type={visible ? "text" : "password"} />
    <button className="password-toggle" type="button" aria-label={label} title={label} aria-controls={inputId} aria-pressed={visible} disabled={props.disabled} onClick={() => setVisible((value) => !value)}>
      {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
    </button>
  </div>;
}
