"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface IconInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {
  id: string;
  label: string;
  icon: React.ReactNode;
}

/**
 * Labelled input with a leading icon and, for password fields, a show/hide
 * toggle. Built on the shared `.input` primitive for visual consistency.
 */
export const IconInput: React.FC<IconInputProps> = ({
  id,
  label,
  icon,
  type = "text",
  ...props
}) => {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword && reveal ? "text" : type;

  return (
    <div>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      <div className="relative">
        <span
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-2"
          aria-hidden="true"
        >
          {icon}
        </span>
        <input
          id={id}
          type={effectiveType}
          className="input"
          style={{ paddingLeft: "2.375rem", paddingRight: isPassword ? "2.5rem" : undefined }}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="absolute inset-y-0 right-1.5 flex cursor-pointer items-center rounded-md px-1.5 text-muted-2 transition-colors hover:text-ink"
            aria-label={reveal ? "Hide password" : "Show password"}
            aria-pressed={reveal}
            tabIndex={-1}
          >
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

export default IconInput;
