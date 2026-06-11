"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import { SignupGuideLayout } from "@/components/auth/SignupGuideLayout";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { IconInput } from "@/components/ui/IconInput";
import { Feedback } from "@/components/ui/Feedback";
import { Spinner } from "@/components/ui/Spinner";
import { friendlyError, readApiError } from "@/lib/friendlyError";
import { getPasswordStrength, USERNAME_PATTERN } from "@/lib/signupFlow";

type WizardStep = "username" | "password";

export default function SignupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref")?.trim().toUpperCase() ?? "";

  const [step, setStep] = useState<WizardStep>("username");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  const checkUsername = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!USERNAME_PATTERN.test(trimmed)) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    try {
      const res = await fetch(
        `/api/auth/signup/check-username?username=${encodeURIComponent(trimmed)}`,
      );
      const data = (await res.json()) as { available?: boolean };
      setUsernameAvailable(Boolean(data.available));
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameAvailable(null);
      return;
    }
    const id = window.setTimeout(() => void checkUsername(trimmed), 400);
    return () => window.clearTimeout(id);
  }, [username, checkUsername]);

  const goToPassword = () => {
    setError(null);
    const trimmed = username.trim();
    if (!USERNAME_PATTERN.test(trimmed)) {
      setError("Username must be 3–32 characters (letters, numbers, _ or -).");
      return;
    }
    if (usernameAvailable === false) {
      setError("That username is already taken. Try another.");
      return;
    }
    setStep("password");
  };

  const handleCreateAccount = async () => {
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    const strength = getPasswordStrength(password);
    if (!strength.meetsMinimum) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          ...(referralCode ? { referralCode } : {}),
        }),
        keepalive: true,
      });

      if (!res.ok) {
        throw new Error(
          await readApiError(res, "We couldn't create your account. Please try again."),
        );
      }

      router.replace("/signup/email");
      router.refresh();
    } catch (err: unknown) {
      setError(
        friendlyError(err, "We couldn't create your account. Please try again."),
      );
      setLoading(false);
    }
  };

  if (step === "username") {
    return (
      <SignupGuideLayout
        step="username"
        footer={
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-ink hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        <div className="space-y-4">
          {error && <Feedback variant="error">{error}</Feedback>}
          {referralCode ? (
            <Feedback variant="success">
              Invited with code <strong>{referralCode}</strong> — finish signup to earn bonus scans.
            </Feedback>
          ) : null}

          <IconInput
            id="username"
            label="Username"
            icon={<User className="h-4 w-4" />}
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your-username"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                goToPassword();
              }
            }}
          />

          {username.trim() ? (
            <p className="text-[11px] text-muted-2">
              {checkingUsername ? (
                <span className="inline-flex items-center gap-1.5">
                  <Spinner size={12} /> Checking availability…
                </span>
              ) : usernameAvailable === true ? (
                <span className="text-positive font-medium">
                  @{username.trim()} is available
                </span>
              ) : usernameAvailable === false ? (
                <span className="text-danger font-medium">
                  @{username.trim()} is taken
                </span>
              ) : !USERNAME_PATTERN.test(username.trim()) ? (
                "Use letters, numbers, underscores, or hyphens."
              ) : null}
            </p>
          ) : null}

          <button
            type="button"
            onClick={goToPassword}
            disabled={checkingUsername || usernameAvailable === false}
            className="btn-primary btn-md w-full"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </SignupGuideLayout>
    );
  }

  return (
    <SignupGuideLayout
      step="password"
      showBack={false}
      guideHeadline={`Nice choice, ${username.trim()}.`}
      guideCopy="Set a strong password — you'll use it with your username every time you sign in."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Feedback variant="error">{error}</Feedback>}

        <div className="rounded-xl border border-line bg-surface/50 px-3.5 py-2.5 text-[12px] text-muted">
          Signing up as{" "}
          <strong className="font-semibold text-ink">{username.trim()}</strong>
        </div>

        <IconInput
          id="password"
          label="Password"
          icon={<Lock className="h-4 w-4" />}
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />

        <PasswordStrengthMeter password={password} />

        <IconInput
          id="confirmPassword"
          label="Confirm password"
          icon={<Lock className="h-4 w-4" />}
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your password"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setStep("username");
              setError(null);
            }}
            disabled={loading}
            className="btn-secondary btn-md flex-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={handleCreateAccount}
            disabled={loading}
            aria-busy={loading || undefined}
            className="btn-primary btn-md flex-[2]"
          >
            {loading ? (
              <>
                <Spinner size={15} /> Creating…
              </>
            ) : (
              "Create account"
            )}
          </button>
        </div>
      </div>
    </SignupGuideLayout>
  );
}
