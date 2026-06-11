"use client";

import React from "react";
import { getPasswordStrength } from "@/lib/signupFlow";

export function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  if (!password) return null;

  const colors = [
    "bg-danger",
    "bg-[#f59e0b]",
    "bg-[#eab308]",
    "bg-positive",
    "bg-positive",
  ];

  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= strength.score ? colors[strength.score] : "bg-line-strong"
            }`}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-2">
        Password strength:{" "}
        <span className={strength.meetsMinimum ? "text-ink font-medium" : "text-danger"}>
          {strength.label}
        </span>
        {!strength.meetsMinimum ? " · at least 8 characters" : null}
      </p>
    </div>
  );
}
