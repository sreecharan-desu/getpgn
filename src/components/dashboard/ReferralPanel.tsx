"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/Spinner";
import { friendlyError } from "@/lib/friendlyError";
import { ReferralShareButtons } from "@/components/referrals/ReferralShareButtons";

type ReferralRow = {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  refereeUsername: string;
};

export function ReferralPanel() {
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [link, setLink] = useState("");
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/referral");
      if (!res.ok) throw new Error("Could not load referral info.");
      const data = (await res.json()) as {
        code: string;
        link: string;
        referrals: ReferralRow[];
      };
      setCode(data.code);
      setLink(data.link);
      setReferrals(data.referrals ?? []);
    } catch (err) {
      toast.error(friendlyError(err, "Could not load referral info."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="gp-account-cal-section">
      <div className="gp-account-cal-row">
        <div className="min-w-0 flex-1">
          <p className="gp-account-cal-row__label">Refer friends</p>
          <p className="gp-account-cal-row__hint">
            When a friend signs up, verifies email, and completes their first scan,
            you both earn <strong className="font-semibold text-ink">+2 bonus scans</strong>.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="gp-account-cal-row">
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <Spinner size={14} />
            Loading referral link…
          </div>
        </div>
      ) : (
        <>
          <div className="gp-account-cal-row">
            <div className="min-w-0 flex-1">
              <p className="gp-account-cal-row__label">Your code</p>
              <p className="gp-account-cal-row__hint">Friends can enter this at signup.</p>
              <p className="mt-2 text-[14px] font-semibold tracking-wide text-ink">
                {code}
              </p>
            </div>
          </div>

          <div className="gp-account-cal-row">
            <div className="min-w-0 flex-1">
              <p className="gp-account-cal-row__label">Share link</p>
              <p className="gp-account-cal-row__hint">Send this link to invite friends.</p>
              <p className="mt-2 truncate font-mono text-[13px] text-ink">{link}</p>
            </div>
          </div>

          <div className="gp-account-cal-row">
            <div className="min-w-0 flex-1">
              <p className="gp-account-cal-row__label">Share</p>
              <p className="gp-account-cal-row__hint">Copy or post your invite link.</p>
              <div className="mt-3">
                <ReferralShareButtons link={link} code={code} />
              </div>
            </div>
          </div>
        </>
      )}

      {referrals.length > 0 ? (
        <>
          <div className="gp-account-cal-row">
            <div className="min-w-0 flex-1">
              <p className="gp-account-cal-row__label">Recent referrals</p>
              <p className="gp-account-cal-row__hint">
                Friends who joined with your link.
              </p>
            </div>
          </div>
          {referrals.map((r) => (
            <div key={r.id} className="gp-account-cal-row">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-ink">{r.refereeUsername}</p>
              </div>
              <span
                className={
                  r.status === "completed"
                    ? "shrink-0 text-[12px] font-medium text-positive"
                    : "shrink-0 text-[12px] font-medium text-muted"
                }
              >
                {r.status === "completed" ? "Rewarded" : "Pending"}
              </span>
            </div>
          ))}
        </>
      ) : null}
    </section>
  );
}
