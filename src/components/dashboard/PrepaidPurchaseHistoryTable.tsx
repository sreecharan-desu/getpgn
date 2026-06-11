"use client";

import React, { useRef } from "react";
import { RazorpayLogo } from "@/components/ui/RazorpayLogo";
import { InfiniteScrollSentinel } from "@/components/dashboard/InfiniteScrollSentinel";
import { formatOrganizerInr } from "@/lib/organizerPricing";
import type { OrganizerPurchaseRow } from "@/hooks/useOrganizerPurchasesPagination";

type PrepaidPurchaseHistoryTableProps = {
  purchases: OrganizerPurchaseRow[];
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
};

function formatPurchaseDate(purchase: OrganizerPurchaseRow): string {
  return new Date(purchase.completedAt ?? purchase.createdAt).toLocaleDateString(
    "en-US",
    { dateStyle: "medium" },
  );
}

function purchaseStatusLabel(status: string): string {
  if (status === "COMPLETED") return "Paid";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function PrepaidPurchaseHistoryTable({
  purchases,
  total,
  hasMore,
  loadingMore,
  onLoadMore,
}: PrepaidPurchaseHistoryTableProps) {
  const scrollRootRef = useRef<HTMLDivElement>(null);

  if (purchases.length === 0) {
    return (
      <div className="gp-account-cal-row">
        <div className="min-w-0 flex-1">
          <p className="gp-account-cal-row__label">No prepaid purchases yet</p>
          <p className="gp-account-cal-row__hint">
            Prepaid scan packs appear here after Razorpay confirms payment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="gp-account-cal-row !items-start !pb-3">
        <div className="min-w-0 w-full">
          <div
            ref={scrollRootRef}
            className="gp-account-cal-table-scroll -mx-1 max-h-[min(20rem,50vh)] overflow-x-auto overflow-y-auto px-1"
          >
            <table className="gp-account-cal-table w-full min-w-[32rem] text-left">
              <thead>
                <tr>
                  <th scope="col">Description</th>
                  <th scope="col">Date</th>
                  <th scope="col" className="text-right">
                    Amount
                  </th>
                  <th scope="col" className="text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => {
                  const paid = purchase.status === "COMPLETED";
                  return (
                    <tr key={purchase.id}>
                      <td>
                        <span className="font-medium text-ink">
                          Prepaid scans ·{" "}
                          {purchase.scansPurchased.toLocaleString()} scans
                        </span>
                      </td>
                      <td className="gp-nums text-muted">
                        {formatPurchaseDate(purchase)}
                      </td>
                      <td className="gp-nums text-right font-medium text-ink">
                        {formatOrganizerInr(purchase.amount)}
                      </td>
                      <td className="text-right">
                        <span
                          className={
                            paid
                              ? "text-positive"
                              : "text-muted"
                          }
                        >
                          {purchaseStatusLabel(purchase.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <InfiniteScrollSentinel
              hasMore={hasMore}
              loading={loadingMore}
              onLoadMore={onLoadMore}
              scrollRootRef={scrollRootRef}
            />
          </div>
          {total > purchases.length ? (
            <p className="mt-2 text-[11px] text-muted-2 gp-nums">
              Showing {purchases.length} of {total} purchases
            </p>
          ) : null}
        </div>
      </div>
      <div className="gp-account-cal-row">
        <div className="min-w-0 flex-1">
          <p className="gp-account-cal-row__hint inline-flex items-center gap-1">
            <RazorpayLogo showWordmark={false} /> Payments processed by Razorpay
          </p>
        </div>
      </div>
    </>
  );
}
