"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock } from "lucide-react";
import { AuthSplitLayout } from "@/components/ui/AuthSplitLayout";
import { IconInput } from "@/components/ui/IconInput";
import { Feedback } from "@/components/ui/Feedback";
import { Spinner } from "@/components/ui/Spinner";
import { friendlyError, readApiError } from "@/lib/friendlyError";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      if (!res.ok) {
        throw new Error(
          await readApiError(res, "We couldn't create your account. Please try again."),
        );
      }

      const data = (await res.json()) as { email?: string };
      const verifiedEmail = data.email ?? email.trim().toLowerCase();
      router.replace(
        `/verify-email?email=${encodeURIComponent(verifiedEmail)}`,
      );
      router.refresh();
    } catch (err: unknown) {
      setError(
        friendlyError(err, "We couldn't create your account. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      title="Create your account"
      subtitle="Start with 2 free scoresheet scans — no card required."
      panelHeadline="Join GetPGN in seconds."
      panelCopy="Your friendly chess companion is ready to turn every scoresheet into a clean, validated PGN."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Feedback variant="error">{error}</Feedback>}

        <IconInput
          id="username"
          label="Username"
          icon={<User className="h-4 w-4" />}
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          placeholder="your-username"
        />

        <IconInput
          id="email"
          label="Email"
          icon={<Mail className="h-4 w-4" />}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          placeholder="you@example.com"
        />

        <IconInput
          id="password"
          label="Password"
          icon={<Lock className="h-4 w-4" />}
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          placeholder="At least 8 characters"
        />

        <IconInput
          id="confirmPassword"
          label="Confirm password"
          icon={<Lock className="h-4 w-4" />}
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          placeholder="Re-enter your password"
        />

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading || undefined}
          className="btn-primary btn-md w-full"
        >
          {loading ? (
            <>
              <Spinner size={15} /> Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>
    </AuthSplitLayout>
  );
}
