"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Library,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Spinner } from "@/components/ui/Spinner";
import {
  ORGANIZER_DEFAULT_SCANS,
  ORGANIZER_MIN_SCANS,
  calculateOrganizerAmount,
  formatOrganizerInr,
  parseOrganizerScanCount,
} from "@/lib/organizerPricing";
import { openOrganizerOrderCheckout } from "@/lib/razorpayOrderCheckout";
import type { OrganizerAccountSnapshot } from "@/lib/organizerWallet";

type Props = {
  username: string;
  initialAccount: OrganizerAccountSnapshot | null;
};

export default function OrganizerPlanClient({ username, initialAccount }: Props) {
  const [scansInput, setScansInput] = useState(String(ORGANIZER_DEFAULT_SCANS));
  const [account, setAccount] = useState(initialAccount);
  const [checkingOut, setCheckingOut] = useState(false);

  const scans = useMemo(() => parseOrganizerScanCount(scansInput), [scansInput]);
  const amount = scans ? calculateOrganizerAmount(scans) : null;
  const valid = scans !== null;

  const handleCheckout = async () => {
    if (!scans) {
      toast.error(`Minimum purchase is ${ORGANIZER_MIN_SCANS.toLocaleString()} scans.`);
      return;
    }
    setCheckingOut(true);
    try {
      await openOrganizerOrderCheckout({
        scans,
        username,
        onVerified: async ({ availableScans }) => {
          setAccount((prev) => ({
            availableScans,
            totalScansPurchased:
              (prev?.totalScansPurchased ?? 0) + scans,
            totalScansUsed: prev?.totalScansUsed ?? 0,
          }));
          toast.success(`${scans.toLocaleString()} scans added to your wallet.`);
        },
        onError: (msg) => toast.error(msg),
      });
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 px-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between">
          <Link
            href="/dashboard"
            className="btn-ghost inline-flex items-center gap-2 text-[13px]"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <Logo wordmarkSize="sm" />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-2">
            Prepaid · pay-as-you-go
          </p>
          <h1 className="text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">
            Scan credits
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-muted">
            Buy prepaid scan packs from{" "}
            <strong className="font-medium text-ink">
              {formatOrganizerInr(calculateOrganizerAmount(ORGANIZER_MIN_SCANS))}
            </strong>{" "}
            (minimum {ORGANIZER_MIN_SCANS.toLocaleString()} scans). Use instead of a
            subscription, or top up when your Pro monthly or yearly quota runs out.
          </p>
        </div>

        {account && account.totalScansPurchased > 0 ? (
          <div className="card mb-6 grid gap-4 p-5 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-2">
                Available
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
                {account.availableScans.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-2">
                Purchased
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
                {account.totalScansPurchased.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-2">
                Used
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
                {account.totalScansUsed.toLocaleString()}
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
          <section className="card space-y-5 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <ScanLine className="h-4 w-4 text-muted" />
              How many scans?
            </div>

            <div>
              <label
                htmlFor="organizer-scans"
                className="field-label"
              >
                Number of scans
              </label>
              <input
                id="organizer-scans"
                type="number"
                min={ORGANIZER_MIN_SCANS}
                step={1}
                inputMode="numeric"
                value={scansInput}
                onChange={(e) => setScansInput(e.target.value)}
                className="input tabular-nums"
              />
              <p className="mt-2 text-[12px] text-muted">
                Whole numbers only · minimum{" "}
                {ORGANIZER_MIN_SCANS.toLocaleString()}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[4000, 5000, 7500, 10000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setScansInput(String(preset))}
                  className="rounded-full border border-line-strong bg-paper px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:border-ink hover:text-ink"
                >
                  {preset.toLocaleString()}
                </button>
              ))}
            </div>

            {!valid && scansInput.trim() !== "" ? (
              <p className="text-[13px] text-danger">
                Enter at least {ORGANIZER_MIN_SCANS.toLocaleString()} scans.
              </p>
            ) : null}
          </section>

          <aside className="card flex flex-col gap-4 p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-2">
              Summary
            </p>
            <div className="space-y-3 text-[14px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Scans</span>
                <span className="font-medium tabular-nums text-ink">
                  {scans ? scans.toLocaleString() : "—"}
                </span>
              </div>
              <div className="border-t border-line pt-3 flex items-center justify-between gap-3">
                <span className="font-semibold text-ink">Total</span>
                <span className="text-xl font-semibold tabular-nums text-ink">
                  {amount !== null ? formatOrganizerInr(amount) : "—"}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={!valid || checkingOut}
              onClick={() => void handleCheckout()}
              className="btn-primary btn-md mt-auto w-full disabled:opacity-50"
            >
              {checkingOut ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Opening checkout…
                </span>
              ) : (
                "Pay with Razorpay"
              )}
            </button>

            <p className="text-center text-[11px] leading-relaxed text-muted-2">
              One-time payment · Credits never expire · Secure Razorpay checkout
            </p>
          </aside>
        </div>

        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Library,
              title: "Public library",
              text: "Share every game at getpgn.in/library/your-slug",
            },
            {
              icon: ShieldCheck,
              title: "Verified payments",
              text: "Credits apply only after Razorpay confirms payment",
            },
            {
              icon: Sparkles,
              title: "Custom volume",
              text: "Buy 4,000 scans or scale to entire seasons",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-4">
              <Icon className="mb-2 h-4 w-4 text-muted" />
              <p className="text-[13px] font-semibold text-ink">{title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </section>

        {account && account.totalScansPurchased > 0 ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/account?tab=profile" className="btn-secondary btn-md">
              <Check className="h-4 w-4" />
              Set up your library
            </Link>
            <Link href="/dashboard" className="btn-ghost btn-md">
              Start scanning
            </Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}
