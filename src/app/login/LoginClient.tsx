"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { AuthSplitLayout } from "@/components/ui/AuthSplitLayout";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Feedback } from "@/components/ui/Feedback";
import { Spinner } from "@/components/ui/Spinner";
import { loginAction, type LoginFormState } from "./actions";

interface LoginClientProps {
  schemaError?: boolean;
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="btn-primary btn-md w-full"
    >
      {pending ? (
        <>
          <Spinner size={15} /> Signing in…
        </>
      ) : (
        "Sign in"
      )}
    </button>
  );
}

export default function LoginClient({ schemaError = false }: LoginClientProps) {
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(
    loginAction,
    {},
  );

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
      <form action={formAction} className="space-y-4" noValidate>
        {schemaError && (
          <Feedback variant="error">
            Your database schema is out of sync with the app. In the project folder run{" "}
            <code className="font-mono text-[12px]">npm run db:sync</code> then restart the dev server.
            Existing data is preserved — only new columns/tables are added.
          </Feedback>
        )}
        {state?.error ? <Feedback variant="error">{state.error}</Feedback> : null}

        <div>
          <label htmlFor="loginId" className="field-label">
            Username or email
          </label>
          <div className="relative">
            <span
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-2"
              aria-hidden="true"
            >
              <User className="h-4 w-4" />
            </span>
            <input
              id="loginId"
              name="loginId"
              type="text"
              className="input"
              style={{ paddingLeft: "2.375rem" }}
              autoComplete="username"
              required
              disabled={pending}
              placeholder="your-username or you@email.com"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="field-label mb-0">Password</span>
            <Link
              href="/auth/forgot-password"
              className="text-[12px] text-muted transition-colors hover:text-ink"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput label="" disabled={pending} />
        </div>

        <SubmitButton pending={pending} />
      </form>
    </AuthSplitLayout>
  );
}
