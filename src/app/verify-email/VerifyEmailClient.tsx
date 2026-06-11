"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { SignupGuideLayout } from "@/components/auth/SignupGuideLayout";
import { IconInput } from "@/components/ui/IconInput";
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
  lockEmail,
}: {
  initialEmail: string;
  initialCooldownSeconds: number | null;
  lockEmail: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(!!token);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [showEditEmail, setShowEditEmail] = useState(false);
  const [editEmailValue, setEditEmailValue] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const { secondsLeft, startCooldown, canResend } = useResendCooldown(initialCooldownSeconds);

  const canEditEmail = lockEmail && canResend && !resending && !changingEmail;

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

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
          router.replace("/onboarding");
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
          router.replace("/onboarding");
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
    setResending(true);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lockEmail && email ? { email: email.trim() } : {}),
        keepalive: true,
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        retryAfterSeconds?: number;
      };

      if (res.status === 429) {
        const wait = data.retryAfterSeconds ?? 60;
        startCooldown(wait);
        setShowEditEmail(false);
        setError(data.error ?? `Please wait ${wait} seconds before requesting another email.`);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error ?? "We couldn't resend the verification email.");
      }

      startCooldown(data.retryAfterSeconds ?? 60);
      setShowEditEmail(false);
      setInfo("Verification email sent — check your inbox.");
    } catch (err: unknown) {
      setError(friendlyError(err, "We couldn't resend the verification email."));
    } finally {
      setResending(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditEmail) return;

    setError(null);
    setInfo(null);

    const trimmed = editEmailValue.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmed || !emailRegex.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setChangingEmail(true);

    try {
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
        keepalive: true,
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        email?: string;
        retryAfterSeconds?: number;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "We couldn't update your email.");
      }

      const saved = data.email ?? trimmed.toLowerCase();
      setEmail(saved);
      setEditEmailValue("");
      setShowEditEmail(false);
      startCooldown(data.retryAfterSeconds ?? 60);
      setInfo(`Verification link sent to ${saved}.`);
    } catch (err: unknown) {
      setError(friendlyError(err, "We couldn't update your email."));
    } finally {
      setChangingEmail(false);
    }
  };

  const editEmailBlock = canEditEmail ? (
    <div className="space-y-3">
      {!showEditEmail ? (
        <p className="text-center text-[12px] text-muted-2">
          Wrong email?{" "}
          <button
            type="button"
            onClick={() => {
              setShowEditEmail(true);
              setEditEmailValue(email);
              setError(null);
            }}
            className="font-medium text-ink hover:underline"
          >
            Edit email
          </button>
        </p>
      ) : (
        <form onSubmit={handleChangeEmail} className="space-y-3" noValidate>
          <IconInput
            id="edit-email"
            label="New email address"
            icon={<Mail className="h-4 w-4" />}
            type="email"
            autoComplete="email"
            required
            value={editEmailValue}
            onChange={(e) => setEditEmailValue(e.target.value)}
            disabled={changingEmail}
            placeholder="you@example.com"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowEditEmail(false);
                setEditEmailValue("");
                setError(null);
              }}
              disabled={changingEmail}
              className="btn-secondary btn-md flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={changingEmail}
              aria-busy={changingEmail || undefined}
              className="btn-primary btn-md flex-1"
            >
              {changingEmail ? (
                <>
                  <Spinner size={15} /> Saving…
                </>
              ) : (
                "Update & resend"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  ) : null;

  const resendButtonLabel = resending
    ? "Sending…"
    : !canResend
      ? `Resend in ${secondsLeft}s`
      : "Resend verification email";

  const inner = token ? (
    <div className="space-y-4 text-center">
      {verifying && (
        <>
          <Spinner size={24} className="mx-auto" />
          <p className="text-[13px] text-muted">Verifying your email…</p>
        </>
      )}
      {verified && (
        <Feedback variant="success">Email verified. One more step — tell us about you.</Feedback>
      )}
      {error && !verifying && (
        <div className="space-y-4 text-left">
          <Feedback variant="error">{error}</Feedback>
          <p className="text-[13px] text-muted">
            Request a new link below. Verification links expire after 10 minutes.
          </p>
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
          {editEmailBlock}
        </div>
      )}
    </div>
  ) : (
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
          . Click it to continue.
        </p>
        <p className="mt-2 text-[12px] text-muted-2">The link expires in 10 minutes.</p>
      </div>

      {info && <Feedback variant="success">{info}</Feedback>}
      {error && <Feedback variant="error">{error}</Feedback>}

      {email ? (
        <div className="rounded-xl border border-line bg-surface/50 px-3.5 py-2.5 text-center text-[13px] text-muted">
          Waiting for verification at{" "}
          <span className="font-medium text-ink">{email}</span>
        </div>
      ) : null}

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

      {editEmailBlock}

      <p className="text-center text-[12px] text-muted-2">
        Wrong account?{" "}
        <Link href="/auth/logout" className="font-medium text-ink hover:underline">
          Sign out
        </Link>
      </p>
    </div>
  );

  return inner;
}

export default function VerifyEmailClient({
  initialEmail,
  initialCooldownSeconds,
  lockEmail = true,
}: {
  initialEmail: string;
  initialCooldownSeconds: number | null;
  lockEmail?: boolean;
}) {
  return (
    <SignupGuideLayout step="verify" showBack={false}>
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Spinner size={24} />
            <p className="text-[13px] text-muted">Loading…</p>
          </div>
        }
      >
        <VerifyEmailContent
          initialEmail={initialEmail}
          initialCooldownSeconds={initialCooldownSeconds}
          lockEmail={lockEmail}
        />
      </Suspense>
    </SignupGuideLayout>
  );
}
