"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Lock, Mail } from "lucide-react";
import { AuthSplitLayout } from "@/components/ui/AuthSplitLayout";
import { IconInput } from "@/components/ui/IconInput";
import { Feedback } from "@/components/ui/Feedback";
import { Spinner } from "@/components/ui/Spinner";
import { friendlyError, readApiError } from "@/lib/friendlyError";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [success, setSuccess] = useState(false);
  const busy = loading || redirecting || success;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginId || !password) {
      setError("Please enter your username or email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginId.trim(), password }),
      });

      if (!res.ok) {
        throw new Error(
          await readApiError(res, "We couldn't sign you in. Please try again."),
        );
      }

      const data = (await res.json()) as {
        needsVerification?: boolean;
        email?: string;
      };

      if (data.needsVerification) {
        setRedirecting(true);
        router.replace(
          `/verify-email?email=${encodeURIComponent(data.email ?? "")}`,
        );
        router.refresh();
        return;
      }

      setSuccess(true);
      setRedirecting(true);
      router.replace('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(friendlyError(err, "We couldn't sign you in. Please try again."));
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      title="Welcome back"
      subtitle="Sign in to continue digitizing your scoresheets."
      panelHeadline="Your scoresheets, perfectly digitized."
      panelCopy="Meet your chess companion — turning handwritten games into validated PGN, instantly."
      footer={
        <>
          New to GetPGN?{" "}
          <Link href="/signup" className="font-medium text-ink hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Feedback variant="error">{error}</Feedback>}
        {success && (
          <Feedback variant="success">Signed in successfully. Redirecting…</Feedback>
        )}
        {redirecting && !success && (
          <Feedback variant="success">Taking you to email verification…</Feedback>
        )}

        <IconInput
          id="loginId"
          label="Username or email"
          icon={
            loginId.includes("@") ? (
              <Mail className="h-4 w-4" />
            ) : (
              <User className="h-4 w-4" />
            )
          }
          type="text"
          autoComplete="username"
          required
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          disabled={busy}
          placeholder="your-username or you@email.com"
        />

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="field-label mb-0">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-[12px] text-muted transition-colors hover:text-ink"
            >
              Forgot password?
            </Link>
          </div>
          <IconInput
            id="password"
            label=""
            icon={<Lock className="h-4 w-4" />}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          aria-busy={busy || undefined}
          className="btn-primary btn-md w-full"
        >
          {redirecting ? (
            <>
              <Spinner size={15} /> Redirecting…
            </>
          ) : loading ? (
            <>
              <Spinner size={15} /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </AuthSplitLayout>
  );
}
