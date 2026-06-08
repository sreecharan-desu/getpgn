"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AuthShell } from "@/components/ui/AuthShell";
import { Feedback } from "@/components/ui/Feedback";
import { Spinner } from "@/components/ui/Spinner";
import { friendlyError, readApiError } from "@/lib/friendlyError";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!token) {
      setError("This reset link is invalid. Please request a new one.");
      return;
    }
    if (!password || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        throw new Error(
          await readApiError(res, "We couldn't reset your password. Please try again."),
        );
      }

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => router.push("/login"), 1600);
    } catch (err: unknown) {
      setError(
        friendlyError(err, "We couldn't reset your password. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-5">
        <Feedback variant="error">
          This password reset link is invalid or has expired.
        </Feedback>
        <Link
          href="/auth/forgot-password"
          className="btn-secondary btn-md w-full"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && <Feedback variant="error">{error}</Feedback>}
      {success && (
        <Feedback variant="success">
          Password updated. Redirecting to sign in…
        </Feedback>
      )}

      <div>
        <label htmlFor="password" className="field-label">
          New password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading || success}
          placeholder="At least 6 characters"
          className="input"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="field-label">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading || success}
          placeholder="Re-enter your password"
          className="input"
        />
      </div>

      <button
        type="submit"
        disabled={loading || success}
        aria-busy={loading || undefined}
        className="btn-primary btn-md w-full"
      >
        {loading ? (
          <>
            <Spinner size={15} /> Updating…
          </>
        ) : (
          "Reset password"
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password you'll remember."
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
      <Suspense
        fallback={
          <div className="py-4 text-center text-[13px] text-muted">Loading…</div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
