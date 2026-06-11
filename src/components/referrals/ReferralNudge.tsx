"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { PromoCard } from "@/components/ui/PromoCard";
import { REFERRAL_REWARD_SCANS } from "@/lib/referrals";
import { shareReferralNative } from "@/lib/referralShare";
import { friendlyError } from "@/lib/friendlyError";

const DISMISS_PREFIX = "getpgn:promo:referral:";

type ReferralNudgeProps = {
  userId: string;
  /** Emphasize copy when scans are running low. */
  lowScans?: boolean;
  onOpenReferrals?: () => void;
  className?: string;
};

export function ReferralNudge({
  userId,
  lowScans = false,
  onOpenReferrals,
  className = "",
}: ReferralNudgeProps) {
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState("");
  const [ctaLoading, setCtaLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const storageKey = `${DISMISS_PREFIX}${userId}`;

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "1") {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/referral");
      if (!res.ok) throw new Error("Could not load referral link.");
      const data = (await res.json()) as { link: string };
      setLink(data.link);
    } catch (err) {
      console.error(friendlyError(err, "Referral promo load failed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!dismissed) void load();
  }, [dismissed, load]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
  };

  const handleCta = async () => {
    if (!link) {
      onOpenReferrals?.();
      return;
    }

    setCtaLoading(true);
    try {
      const shared = await shareReferralNative(link);
      if (shared) return;

      await navigator.clipboard.writeText(link);
      toast.success("Referral link copied");
    } catch {
      onOpenReferrals?.();
    } finally {
      setCtaLoading(false);
    }
  };

  if (dismissed) return null;

  const body = lowScans ? (
    <>
      Running low on scans? Share your referral link. When a friend signs up and
      completes their first scan, you both get{" "}
      <strong className="font-semibold text-ink">+{REFERRAL_REWARD_SCANS} bonus scans</strong>.
    </>
  ) : (
    <>
      Share your referral link. When a friend signs up and completes their first
      scan, you both get{" "}
      <strong className="font-semibold text-ink">+{REFERRAL_REWARD_SCANS} bonus scans</strong>.
    </>
  );

  return (
    <PromoCard
      icon={<Users className="h-4 w-4" strokeWidth={2} />}
      title="Refer a friend"
      ctaLabel={loading ? "Loading link…" : "Get referral link"}
      onCta={handleCta}
      ctaLoading={loading || ctaLoading}
      onDismiss={handleDismiss}
      className={className}
    >
      {body}
    </PromoCard>
  );
}
