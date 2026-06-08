"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthShell } from "@/components/ui/AuthShell";
import { Feedback } from "@/components/ui/Feedback";
import { Spinner } from "@/components/ui/Spinner";
import { friendlyError, readApiError } from "@/lib/friendlyError";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        throw new Error(
          await readApiError(res, "We couldn't send the reset link. Please try again."),
        );
      }

      setSuccess(true);
      setEmail("");
    } catch (err: unknown) {
      setError(
        friendlyError(err, "We couldn't send the reset link. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Feedback variant="error">{error}</Feedback>}
        {success && (
          <Feedback variant="success">
            If an account exists for that email, a reset link is on its way.
          </Feedback>
        )}

        <div>
          <label htmlFor="email" className="field-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="you@example.com"
            className="input"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading || undefined}
          className="btn-primary btn-md w-full"
        >
          {loading ? (
            <>
              <Spinner size={15} /> Sending link…
            </>
          ) : (
            "Send reset link"
          )}
        </button>
      </form>
    </AuthShell>
  );
}
