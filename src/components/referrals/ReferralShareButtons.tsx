"use client";

import React, { useEffect, useState } from "react";
import { Copy, Mail, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  buildReferralShareUrls,
  shareReferralNative,
} from "@/lib/referralShare";
import { REFERRAL_REWARD_SCANS } from "@/lib/referrals";

type ReferralShareButtonsProps = {
  link: string;
  code?: string;
  compact?: boolean;
  className?: string;
};

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

export function ReferralShareButtons({
  link,
  code,
  compact = false,
  className = "",
}: ReferralShareButtonsProps) {
  const [sharing, setSharing] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const urls = buildReferralShareUrls(link);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const handleNativeShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const shared = await shareReferralNative(link);
      if (!shared) {
        await copy(link, "Referral link");
      }
    } finally {
      setSharing(false);
    }
  };

  const btnClass = compact
    ? "inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-2 text-[12px] font-medium text-ink transition-colors hover:border-line-strong hover:bg-surface"
    : "inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[13px] font-medium text-ink transition-colors hover:border-line-strong hover:bg-surface";

  return (
    <div className={`space-y-3 ${className}`}>
      <p className="text-[12px] text-muted">
        Share your link — you both earn{" "}
        <strong className="font-semibold text-ink">+{REFERRAL_REWARD_SCANS} scans</strong> when
        they complete their first scan.
      </p>
      <div className={`flex flex-wrap gap-2 ${compact ? "" : "sm:gap-2.5"}`}>
        {canNativeShare ? (
          <button type="button" onClick={handleNativeShare} disabled={sharing} className={btnClass}>
            <Share2 className="h-3.5 w-3.5 shrink-0" />
            Share
          </button>
        ) : null}
        <a href={urls.whatsapp} target="_blank" rel="noopener noreferrer" className={btnClass}>
          <WhatsAppIcon className="h-3.5 w-3.5 shrink-0" />
          WhatsApp
        </a>
        <a href={urls.x} target="_blank" rel="noopener noreferrer" className={btnClass}>
          <XIcon className="h-3.5 w-3.5 shrink-0" />
          Post on X
        </a>
        <a href={urls.email} className={btnClass}>
          <Mail className="h-3.5 w-3.5 shrink-0" />
          Email
        </a>
        <button type="button" onClick={() => copy(link, "Referral link")} className={btnClass}>
          <Copy className="h-3.5 w-3.5 shrink-0" />
          Copy link
        </button>
        {code ? (
          <button type="button" onClick={() => copy(code, "Referral code")} className={btnClass}>
            <Copy className="h-3.5 w-3.5 shrink-0" />
            Copy code
          </button>
        ) : null}
      </div>
    </div>
  );
}
