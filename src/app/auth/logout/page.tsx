"use client";

import { useEffect } from "react";
import { StatusShell } from "@/components/ui/StatusShell";
import { Spinner } from "@/components/ui/Spinner";
import { clearAppLocalStorage } from "@/lib/clientStorage";

/** Client logout hop — clears localStorage, then clears the session cookie via POST. */
export default function LogoutPage() {
  useEffect(() => {
    clearAppLocalStorage();
    void fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).finally(
      () => {
        window.location.replace("/");
      },
    );
  }, []);

  return (
    <StatusShell
      showBack={false}
      eyebrow="GetPGN"
      title="Signing you out"
      subtitle="Clearing your session and local data. You'll be redirected in a moment."
    >
      <Spinner size={22} className="text-ink" />
    </StatusShell>
  );
}
