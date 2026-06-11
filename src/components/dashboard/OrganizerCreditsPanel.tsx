"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  ORGANIZER_MIN_SCANS,
  calculateOrganizerAmount,
  formatOrganizerInr,
} from "@/lib/organizerPricing";

type WalletSnapshot = {
  availableScans: number;
  totalScansPurchased: number;
  totalScansUsed: number;
};

export function OrganizerCreditsPanel({
  wallet,
  showSubscriptionNote = false,
}: {
  wallet: WalletSnapshot | null;
  /** Pro / Enterprise subscribers may also have a recurring scan quota. */
  showSubscriptionNote?: boolean;
}) {
  const hasWallet = (wallet?.totalScansPurchased ?? 0) > 0;

  return (
    <section className="gp-account-cal-section">
      <div className="gp-account-cal-row">
        <div className="min-w-0 flex-1">
          <p className="gp-account-cal-row__label">Prepaid scan credits</p>
          <p className="gp-account-cal-row__hint">
            Buy pay-as-you-go packs from{" "}
            {formatOrganizerInr(calculateOrganizerAmount(ORGANIZER_MIN_SCANS))} (
            {ORGANIZER_MIN_SCANS.toLocaleString()} scans minimum). Use instead of a
            subscription, or top up when your monthly or yearly quota runs out.
          </p>
        </div>
        <Link
          href="/organizer"
          className="gp-account-cal-row__action inline-flex items-center gap-1"
        >
          {hasWallet ? "Buy more scans" : "Buy scan credits"}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {hasWallet ? (
        <>
          <div className="gp-account-cal-row">
            <div className="min-w-0 flex-1">
              <p className="gp-account-cal-row__label">Available</p>
              <p className="gp-account-cal-row__hint">Scans ready to use right now.</p>
              <p className="mt-2 text-[14px] font-medium tabular-nums text-ink gp-nums">
                {(wallet?.availableScans ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="gp-account-cal-row">
            <div className="min-w-0 flex-1">
              <p className="gp-account-cal-row__label">Purchased</p>
              <p className="gp-account-cal-row__hint">Total scans bought to date.</p>
              <p className="mt-2 text-[14px] font-medium tabular-nums text-ink gp-nums">
                {(wallet?.totalScansPurchased ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="gp-account-cal-row">
            <div className="min-w-0 flex-1">
              <p className="gp-account-cal-row__label">Used</p>
              <p className="gp-account-cal-row__hint">Scans consumed from your wallet.</p>
              <p className="mt-2 text-[14px] font-medium tabular-nums text-ink gp-nums">
                {(wallet?.totalScansUsed ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="gp-account-cal-row">
            <div className="min-w-0 flex-1">
              <p className="gp-account-cal-row__label">Billing type</p>
              <p className="gp-account-cal-row__hint">How your scan credits are billed.</p>
              <p className="mt-2 text-[14px] text-ink">Pay-as-you-go</p>
            </div>
          </div>
        </>
      ) : (
        <div className="gp-account-cal-row">
          <div className="min-w-0 flex-1">
            <p className="gp-account-cal-row__label">No prepaid pack yet</p>
            <p className="gp-account-cal-row__hint">
              Buy a custom scan pack (e.g. 4,000 or 10,000 scans) when you need more
              than the free tier or subscription quota.
            </p>
          </div>
        </div>
      )}

      {showSubscriptionNote ? (
        <div className="gp-account-cal-row">
          <div className="min-w-0 flex-1">
            <p className="gp-account-cal-row__hint">
              Your subscription scan allowance is shown separately. Prepaid credits
              are used automatically after your plan quota is used up.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
