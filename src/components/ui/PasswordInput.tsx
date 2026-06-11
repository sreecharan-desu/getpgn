"use client";

import React, { useId, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

interface PasswordInputProps {
  id?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
}

/** Uncontrolled password field — avoids autofill hydration breaks on login. */
export function PasswordInput({
  id: idProp,
  name = "password",
  label = "Password",
  placeholder = "••••••••",
  autoComplete = "current-password",
  disabled = false,
  required = true,
}: PasswordInputProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [reveal, setReveal] = useState(false);

  return (
    <div>
      {label ? (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <span
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-2"
          aria-hidden="true"
        >
          <Lock className="h-4 w-4" />
        </span>
        <input
          id={id}
          name={name}
          type={reveal ? "text" : "password"}
          className="input"
          style={{ paddingLeft: "2.375rem", paddingRight: "2.5rem" }}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          required={required}
        />
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          className="absolute inset-y-0 right-1.5 z-10 flex cursor-pointer items-center rounded-md px-1.5 text-muted-2 transition-colors hover:text-ink"
          aria-label={reveal ? "Hide password" : "Show password"}
          aria-pressed={reveal}
          tabIndex={-1}
        >
          {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
