"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { SignupGuideLayout } from "@/components/auth/SignupGuideLayout";
import { IconInput } from "@/components/ui/IconInput";
import { Feedback } from "@/components/ui/Feedback";
import { Spinner } from "@/components/ui/Spinner";
import { friendlyError, readApiError } from "@/lib/friendlyError";

export default function AddEmailClient({ username }: { username: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmed || !emailRegex.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
        keepalive: true,
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "We couldn't save your email. Please try again."));
      }

      const data = (await res.json()) as { email?: string };
      const saved = data.email ?? trimmed.toLowerCase();
      router.replace(`/verify-email?email=${encodeURIComponent(saved)}`);
      router.refresh();
    } catch (err: unknown) {
      setError(friendlyError(err, "We couldn't save your email. Please try again."));
      setLoading(false);
    }
  };

  return (
    <SignupGuideLayout
      step="email"
      title={`Add an email for ${username}`}
      subtitle="We'll send a verification link — no card required."
      guideHeadline={`Almost set, ${username}.`}
      guideCopy="Your username and password are saved. Add an email so we can verify your account and unlock your dashboard."
      backHref="/login"
      backLabel="Sign in instead"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Feedback variant="error">{error}</Feedback>}

        <div className="rounded-xl border border-line bg-surface/50 px-3.5 py-2.5 text-[12px] text-muted">
          Account:{" "}
          <strong className="font-semibold text-ink">{username}</strong>
        </div>

        <IconInput
          id="email"
          label="Email address"
          icon={<Mail className="h-4 w-4" />}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          placeholder="you@example.com"
        />

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading || undefined}
          className="btn-primary btn-md w-full"
        >
          {loading ? (
            <>
              <Spinner size={15} /> Saving…
            </>
          ) : (
            "Send verification email"
          )}
        </button>

        <p className="text-center text-[12px] text-muted-2">
          Wrong account?{" "}
          <Link href="/auth/logout" className="font-medium text-ink hover:underline">
            Sign out
          </Link>
        </p>
      </form>
    </SignupGuideLayout>
  );
}
