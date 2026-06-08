"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { AuthShell } from "@/components/ui/AuthShell";
import { Feedback } from "@/components/ui/Feedback";
import { Spinner } from "@/components/ui/Spinner";
import { friendlyError, readApiError } from "@/lib/friendlyError";

const COOLDOWN_STORAGE_KEY = "getpgn_verify_resend_until";

function useResendCooldown(initialSeconds: number | null) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  const syncFromTimestamp = useCallback((until: number) => {
    const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
    setSecondsLeft(remaining);
    if (remaining > 0) {
      try {
        localStorage.setItem(COOLDOWN_STORAGE_KEY, String(until));
      } catch {
        /* ignore */
      }
    } else {
      try {
        localStorage.removeItem(COOLDOWN_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    return remaining;
  }, []);

  const startCooldown = useCallback(
    (seconds: number) => {
      if (seconds <= 0) return;
      syncFromTimestamp(Date.now() + seconds * 1000);
    },
    [syncFromTimestamp],
  );

  useEffect(() => {
    let until = 0;
    if (initialSeconds && initialSeconds > 0) {
      until = Date.now() + initialSeconds * 1000;
    } else {
      try {
        const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
        if (stored) until = parseInt(stored, 10);
      } catch {
        /* ignore */
      }
    }
    if (until > 0) syncFromTimestamp(until);
  }, [initialSeconds, syncFromTimestamp]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      try {
        const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
        if (!stored) {
          setSecondsLeft(0);
          return;
        }
        syncFromTimestamp(parseInt(stored, 10));
      } catch {
        setSecondsLeft(0);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [secondsLeft, syncFromTimestamp]);

  return { secondsLeft, startCooldown, canResend: secondsLeft <= 0 };
}

function VerifyEmailContent({
  initialEmail,
  initialCooldownSeconds,
}: {
  initialEmail: string;
  initialCooldownSeconds: number | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const [email, setEmail] = useState(initialEmail || emailParam || "");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(!!token);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const { secondsLeft, startCooldown, canResend } = useResendCooldown(initialCooldownSeconds);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
    else if (emailParam) setEmail(emailParam);
  }, [initialEmail, emailParam]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/verification-status");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          verified?: boolean;
          email?: string;
          cooldownSeconds?: number;
        };
        if (cancelled) return;
        if (data.verified) {
          router.replace("/dashboard");
          return;
        }
        if (data.email) setEmail(data.email);
        if (data.cooldownSeconds && data.cooldownSeconds > 0) {
          startCooldown(data.cooldownSeconds);
        }
      } catch {
        /* non-fatal */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, startCooldown]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    (async () => {
      setVerifying(true);
      setError(null);

      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          throw new Error(
            await readApiError(res, "We couldn't verify your email. Please try again."),
          );
        }

        if (cancelled) return;

        setVerified(true);
        try {
          localStorage.removeItem(COOLDOWN_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        setTimeout(() => {
          router.replace("/dashboard");
          router.refresh();
        }, 1400);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(friendlyError(err, "We couldn't verify your email. Please try again."));
        }
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  const handleResend = async () => {
    if (!canResend || resending) return;

    setError(null);
    setInfo(null);

    if (!email.trim()) {
      setError("Enter the email address you used to sign up.");
      return;
    }

    setResending(true);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
        keepalive: true,
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        retryAfterSeconds?: number;
      };

      if (res.status === 429) {
        const wait = data.retryAfterSeconds ?? 60;
        startCooldown(wait);
        setError(data.error ?? `Please wait ${wait} seconds before requesting another email.`);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error ?? "We couldn't resend the verification email.");
      }

      startCooldown(data.retryAfterSeconds ?? 60);
      setInfo("Verification email sent — check your inbox.");
    } catch (err: unknown) {
      setError(friendlyError(err, "We couldn't resend the verification email."));
    } finally {
      setResending(false);
    }
  };

  const resendButtonLabel = resending
    ? "Sending…"
    : !canResend
      ? `Resend in ${secondsLeft}s`
      : "Resend verification email";

  if (token) {
    return (
      <div className="space-y-4 text-center">
        {verifying && (
          <>
            <Spinner size={24} className="mx-auto" />
            <p className="text-[13px] text-muted">Verifying your email…</p>
          </>
        )}
        {verified && (
          <Feedback variant="success">Email verified. Redirecting to your dashboard…</Feedback>
        )}
        {error && !verifying && (
          <div className="space-y-4">
            <Feedback variant="error">{error}</Feedback>
            <p className="text-[13px] text-muted">
              Request a new link below. Verification links expire after 10 minutes.
            </p>
            <div>
              <label htmlFor="resend-email" className="field-label text-left">
                Email
              </label>
              <input
                id="resend-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
              />
            </div>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || !canResend}
              aria-busy={resending || undefined}
              className="btn-primary btn-md w-full"
            >
              {resending ? (
                <>
                  <Spinner size={15} /> Sending…
                </>
              ) : (
                resendButtonLabel
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line bg-surface p-5 text-center">
        <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl border border-line-strong bg-paper text-ink">
          <Mail className="h-5 w-5" />
        </span>
        <p className="text-[14px] leading-relaxed text-muted">
          We sent a verification link
          {email ? (
            <>
              {" "}
              to <span className="font-medium text-ink">{email}</span>
            </>
          ) : (
            " to your email"
          )}
          . Click it to activate your account.
        </p>
        <p className="mt-2 text-[12px] text-muted-2">The link expires in 10 minutes.</p>
      </div>

      {info && <Feedback variant="success">{info}</Feedback>}
      {error && <Feedback variant="error">{error}</Feedback>}

      <div>
        <label htmlFor="verify-email" className="field-label">
          Didn&apos;t get it? Resend to
        </label>
        <input
          id="verify-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="input"
          readOnly={Boolean(initialEmail)}
        />
      </div>

      <button
        type="button"
        onClick={handleResend}
        disabled={resending || !canResend}
        aria-busy={resending || undefined}
        className="btn-secondary btn-md w-full"
      >
        {resending ? (
          <>
            <Spinner size={15} /> Sending…
          </>
        ) : (
          resendButtonLabel
        )}
      </button>

      <Link href="/login" className="btn-ghost btn-md w-full">
        Back to sign in
      </Link>
    </div>
  );
}

export default function VerifyEmailClient({
  initialEmail,
  initialCooldownSeconds,
}: {
  initialEmail: string;
  initialCooldownSeconds: number | null;
}) {
  return (
    <AuthShell
      title="Verify your email"
      subtitle="One quick step before you can start digitizing scoresheets."
    >
      <Suspense
        fallback={<div className="py-4 text-center text-[13px] text-muted">Loading…</div>}
      >
        <VerifyEmailContent
          initialEmail={initialEmail}
          initialCooldownSeconds={initialCooldownSeconds}
        />
      </Suspense>
    </AuthShell>
  );
}
