"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/Spinner";

type AccountRow = {
  id: string;
  availableScans: number;
  totalScansPurchased: number;
  totalScansUsed: number;
  user: { id: string; username: string; email: string | null; plan: string };
};

type PurchaseRow = {
  id: string;
  scansPurchased: number;
  amount: number;
  status: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  createdAt: string;
  user: { id: string; username: string; email: string | null };
};

export default function AdminOrganizersClient() {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [creditUserId, setCreditUserId] = useState("");
  const [creditScans, setCreditScans] = useState("1000");

  const load = useCallback(async () => {
    if (!apiKey.trim()) {
      toast.error("Enter the admin API key.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/organizers", {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Load failed");
      setAccounts(data.accounts ?? []);
      setPurchases(data.recentPurchases ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load data.");
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  const credit = async () => {
    if (!apiKey.trim() || !creditUserId.trim()) return;
    const scans = Number.parseInt(creditScans, 10);
    if (!Number.isFinite(scans) || scans < 1) {
      toast.error("Invalid scan count.");
      return;
    }
    try {
      const res = await fetch(`/api/admin/organizers/${creditUserId.trim()}/credit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scans }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Credit failed");
      toast.success(`Credited ${scans.toLocaleString()} scans.`);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not credit scans.");
    }
  };

  return (
    <div className="min-h-screen bg-paper px-4 py-8 text-ink sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/dashboard" className="btn-ghost inline-flex items-center gap-2 text-[13px]">
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight">Organizer admin</h1>

        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="field-label" htmlFor="admin-key">
              Admin API key
            </label>
            <input
              id="admin-key"
              type="password"
              className="input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="ADMIN_API_KEY"
            />
          </div>
          <button type="button" onClick={() => void load()} className="btn-primary btn-md">
            {loading ? <Spinner className="h-4 w-4" /> : "Load"}
          </button>
        </div>

        <div className="card space-y-3 p-4">
          <p className="text-[13px] font-semibold">Manual credit</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              className="input"
              placeholder="User ID"
              value={creditUserId}
              onChange={(e) => setCreditUserId(e.target.value)}
            />
            <input
              className="input"
              type="number"
              placeholder="Scans"
              value={creditScans}
              onChange={(e) => setCreditScans(e.target.value)}
            />
            <button type="button" onClick={() => void credit()} className="btn-secondary btn-md">
              <Plus className="h-4 w-4" />
              Credit scans
            </button>
          </div>
        </div>

        <section className="card overflow-hidden">
          <div className="border-b border-line px-4 py-3 text-[13px] font-semibold">
            Balances ({accounts.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">User</th>
                  <th className="px-4 py-2 font-medium">Available</th>
                  <th className="px-4 py-2 font-medium">Purchased</th>
                  <th className="px-4 py-2 font-medium">Used</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-t border-line">
                    <td className="px-4 py-2">
                      <div className="font-medium">{a.user.username}</div>
                      <div className="text-[11px] text-muted">{a.user.id}</div>
                    </td>
                    <td className="px-4 py-2 tabular-nums">{a.availableScans}</td>
                    <td className="px-4 py-2 tabular-nums">{a.totalScansPurchased}</td>
                    <td className="px-4 py-2 tabular-nums">{a.totalScansUsed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-line px-4 py-3 text-[13px] font-semibold">
            Recent purchases
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">User</th>
                  <th className="px-4 py-2 font-medium">Scans</th>
                  <th className="px-4 py-2 font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Order</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-4 py-2">{p.user.username}</td>
                    <td className="px-4 py-2 tabular-nums">{p.scansPurchased}</td>
                    <td className="px-4 py-2">₹{p.amount}</td>
                    <td className="px-4 py-2">{p.status}</td>
                    <td className="px-4 py-2 font-mono text-[11px] text-muted">
                      {p.razorpayOrderId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
