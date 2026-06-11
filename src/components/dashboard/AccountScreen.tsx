"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Check,
  CreditCard,
  Gift,
  KeyRound,
  Lock,
  Mail,
  Pencil,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { ChessPieceAvatar } from "@/components/ui/ChessPieceAvatar";
import { ChessPieceIcon } from "@/components/ui/ChessPieceIcon";
import { IconInput } from "@/components/ui/IconInput";
import { Spinner } from "@/components/ui/Spinner";
import { ReferralPanel } from "@/components/dashboard/ReferralPanel";
import { OrganizerCreditsPanel } from "@/components/dashboard/OrganizerCreditsPanel";
import { OrganizerLibraryPanel } from "@/components/dashboard/OrganizerLibraryPanel";
import { FreeVsProTable } from "@/components/dashboard/FreePlanUI";
import {
  CHESS_AVATAR_LABELS,
  CHESS_AVATAR_PIECES,
  type ChessAvatarPiece,
  resolveAvatarPiece,
} from "@/lib/chessAvatars";
import { friendlyError, readApiErrorOrLogout } from "@/lib/friendlyError";
import type { ScanUsage } from "@/lib/scanLimits";

type AccountTab = "profile" | "security" | "billing" | "referrals";

export interface AccountUser {
  id: string;
  username: string;
  email?: string | null;
  avatarPiece?: string | null;
  plan: "FREE" | "PAID" | "ENTERPRISE";
  createdAt?: string | null;
}

interface AccountScreenProps {
  user: AccountUser;
  onUserUpdate: (patch: Partial<AccountUser>) => void;
  scanUsage: ScanUsage;
  isPro: boolean;
  isEnterprise: boolean;
  hasOrganizerWallet?: boolean;
  onBack: () => void;
  onUpgrade: () => void;
  billingPanel: React.ReactNode;
  initialTab?: AccountTab;
}

const TAB_META: Record<AccountTab, { description: string }> = {
  profile: {
    description: "Manage how you appear on GetPGN.",
  },
  security: {
    description: "Keep your account safe with a strong password.",
  },
  billing: {
    description: "Your plan, scan usage, and invoices.",
  },
  referrals: {
    description: "Share GetPGN and earn rewards.",
  },
};

function accountGreeting(
  tab: AccountTab,
  username: string,
): { title: string; description: string } {
  if (tab === "profile") {
    return {
      title: `Hey, @${username}`,
      description: TAB_META.profile.description,
    };
  }
  const titles: Record<Exclude<AccountTab, "profile">, string> = {
    security: "Security",
    billing: "Billing",
    referrals: "Referrals",
  };
  return {
    title: titles[tab],
    description: TAB_META[tab].description,
  };
}

function UsageBar({
  scanUsage,
  onUpgrade,
  showUpgrade,
}: {
  scanUsage: ScanUsage;
  onUpgrade?: () => void;
  showUpgrade?: boolean;
}) {
  const { used, limit, remaining, planLabel } = scanUsage;
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <div className="gp-account-cal-usage">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-muted">
          {planLabel} ·{" "}
          <span className="tabular-nums text-ink gp-nums">
            {remaining.toLocaleString()} left
          </span>
        </p>
        <div className="gp-account-cal-usage__bar mt-2" aria-hidden="true">
          <div
            className="gp-account-cal-usage__fill"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {showUpgrade && onUpgrade ? (
        <button
          type="button"
          onClick={onUpgrade}
          className="btn-primary btn-sm shrink-0"
        >
          Upgrade
        </button>
      ) : null}
    </div>
  );
}

export function AccountScreen({
  user,
  onUserUpdate,
  scanUsage,
  isPro,
  isEnterprise,
  hasOrganizerWallet = false,
  onBack,
  onUpgrade,
  billingPanel,
  initialTab = "profile",
}: AccountScreenProps) {
  const [tab, setTab] = useState<AccountTab>(initialTab);
  const [editingName, setEditingName] = useState(false);
  const [usernameInput, setUsernameInput] = useState(user.username);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [organizerWallet, setOrganizerWallet] = useState<{
    availableScans: number;
    totalScansPurchased: number;
    totalScansUsed: number;
  } | null>(null);

  useEffect(() => {
    void fetch("/api/organizer/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.account) setOrganizerWallet(data.account);
      })
      .catch(() => undefined);
  }, []);

  const showOrganizerTools =
    isEnterprise || hasOrganizerWallet || (organizerWallet?.totalScansPurchased ?? 0) > 0;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const activePiece = resolveAvatarPiece(user.avatarPiece, user.username);
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "—";

  const planLabel = isEnterprise ? "Enterprise" : isPro ? "Pro" : "Free";

  const showUpgradeCta = !isPro && !isEnterprise && !hasOrganizerWallet;
  const greeting = accountGreeting(tab, user.username);

  const handleSaveAvatar = async (piece: ChessAvatarPiece) => {
    if (savingAvatar || piece === activePiece) {
      setShowAvatarPicker(false);
      return;
    }
    setSavingAvatar(true);
    try {
      const res = await fetch("/api/auth/change-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarPiece: piece }),
      });
      if (!res.ok) {
        const apiErr = await readApiErrorOrLogout(
          res,
          "Could not update your avatar.",
        );
        if (apiErr === null) return;
        throw new Error(apiErr);
      }
      const data = await res.json();
      const updated =
        typeof data.avatarPiece === "string" ? data.avatarPiece : piece;
      onUserUpdate({ avatarPiece: updated });
      setShowAvatarPicker(false);
      toast.success(`Avatar updated to ${CHESS_AVATAR_LABELS[piece]}.`);
    } catch (err) {
      toast.error(friendlyError(err, "Could not update your avatar."));
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleChangeUsername = async () => {
    const next = usernameInput.trim();
    if (savingUsername || next.length < 3 || next === user.username) {
      setEditingName(false);
      return;
    }
    setSavingUsername(true);
    try {
      const res = await fetch("/api/auth/change-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: next }),
      });
      if (!res.ok) {
        const apiErr = await readApiErrorOrLogout(
          res,
          "We couldn't update your username.",
        );
        if (apiErr === null) return;
        throw new Error(apiErr);
      }
      const data = await res.json();
      const updated = typeof data.username === "string" ? data.username : next;
      onUserUpdate({ username: updated });
      setUsernameInput(updated);
      setEditingName(false);
      toast.success("Username updated.");
    } catch (err) {
      toast.error(friendlyError(err, "We couldn't update your username."));
    } finally {
      setSavingUsername(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingPassword) return;
    if (!currentPassword || !newPassword) {
      toast.error("Please enter your current and new password.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Your new password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const apiErr = await readApiErrorOrLogout(
          res,
          "We couldn't update your password.",
        );
        if (apiErr === null) return;
        throw new Error(apiErr);
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
    } catch (err) {
      toast.error(friendlyError(err, "We couldn't update your password."));
    } finally {
      setSavingPassword(false);
    }
  };

  const tabs: { id: AccountTab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
    {
      id: "security",
      label: "Security",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      id: "billing",
      label: "Billing",
      icon: <CreditCard className="h-4 w-4" />,
    },
    { id: "referrals", label: "Referrals", icon: <Gift className="h-4 w-4" /> },
  ];

  return (
    <main className="gp-account-cal mx-auto w-full max-w-[54rem] px-4 py-6 pb-8 sm:px-6 sm:py-8 gp-fade-in">
      <button
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mt-7 flex flex-col gap-8 md:mt-9 md:flex-row md:gap-16">
        <aside className="md:w-[12rem] md:shrink-0">
          <div className="gp-account-cal-aside-user mb-6 md:mb-7">
            <div className="relative shrink-0">
              <ChessPieceAvatar
                piece={user.avatarPiece}
                username={user.username}
                size={40}
                isPro={isPro || isEnterprise || hasOrganizerWallet}
                className="ring-2 ring-paper"
              />
              <button
                type="button"
                onClick={() => {
                  setTab("profile");
                  setShowAvatarPicker(true);
                }}
                className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-ink text-paper cursor-pointer"
                aria-label="Change avatar"
              >
                <Pencil className="h-2 w-2" />
              </button>
            </div>
            <div className="min-w-0">
              <p className="gp-account-cal-aside-user__name truncate">
                @{user.username}
              </p>
              <p className="gp-account-cal-aside-user__meta">{planLabel} plan</p>
            </div>
          </div>

          <nav className="gp-account-cal-nav" aria-label="Account sections">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={`gp-account-cal-nav__link cursor-pointer ${
                  tab === t.id ? "gp-account-cal-nav__link--active" : ""
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>

          {showUpgradeCta ? (
            <div className="mt-5 hidden border-t border-line/45 pt-5 md:block">
              <UsageBar
                scanUsage={scanUsage}
                onUpgrade={onUpgrade}
                showUpgrade
              />
            </div>
          ) : null}
        </aside>

        <div className="min-w-0 flex-1">
          <header className="gp-account-cal-greeting mb-6 sm:mb-7">
            <h1 className="gp-account-cal-greeting__title normal-case">
              {greeting.title}
            </h1>
            <p className="gp-account-cal-greeting__desc">{greeting.description}</p>
          </header>

          {showUpgradeCta && tab !== "billing" ? (
            <div className="mb-6 md:hidden">
              <UsageBar scanUsage={scanUsage} onUpgrade={onUpgrade} showUpgrade />
            </div>
          ) : null}

          {tab === "profile" ? (
            <div className="space-y-8">
              <section className="gp-account-cal-section">
                <div className="gp-account-cal-row">
                  <div className="min-w-0 flex-1">
                    <p className="gp-account-cal-row__label">Username</p>
                    <p className="gp-account-cal-row__hint">
                      Your public handle on GetPGN.
                    </p>
                    {editingName ? (
                      <form
                        className="mt-3 flex max-w-sm items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleChangeUsername();
                        }}
                      >
                        <input
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          maxLength={32}
                          autoFocus
                          className="input h-10 flex-1 text-[14px]"
                        />
                        <button
                          type="submit"
                          disabled={
                            savingUsername || usernameInput.trim().length < 3
                          }
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink text-paper disabled:opacity-40 cursor-pointer"
                        >
                          {savingUsername ? (
                            <Spinner size={14} />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUsernameInput(user.username);
                            setEditingName(false);
                          }}
                          className="text-[12px] font-medium text-muted hover:text-ink cursor-pointer"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <p className="mt-2 text-[14px] text-ink">@{user.username}</p>
                    )}
                  </div>
                  {!editingName ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUsernameInput(user.username);
                        setEditingName(true);
                      }}
                      className="gp-account-cal-row__action cursor-pointer"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>

                {user.email ? (
                  <div className="gp-account-cal-row">
                    <div className="min-w-0 flex-1">
                      <p className="gp-account-cal-row__label">Email</p>
                      <p className="gp-account-cal-row__hint">
                        Used to sign in and recover your account.
                      </p>
                      <p className="mt-2 flex items-center gap-1.5 text-[14px] text-ink">
                        <Mail className="h-3.5 w-3.5 text-muted" />
                        <span className="truncate">{user.email}</span>
                        <BadgeCheck
                          className="h-4 w-4 shrink-0 text-positive"
                          aria-label="Verified"
                        />
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="gp-account-cal-row">
                  <div className="min-w-0 flex-1">
                    <p className="gp-account-cal-row__label">Avatar</p>
                    <p className="gp-account-cal-row__hint">
                      Pick a chess piece — yours is{" "}
                      {CHESS_AVATAR_LABELS[activePiece].toLowerCase()}.
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <ChessPieceAvatar
                        piece={user.avatarPiece}
                        username={user.username}
                        size={48}
                        isPro={isPro || isEnterprise || hasOrganizerWallet}
                      />
                      <span className="text-[13px] text-muted">
                        {CHESS_AVATAR_LABELS[activePiece]}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker((v) => !v)}
                    className="gp-account-cal-row__action cursor-pointer"
                  >
                    {showAvatarPicker ? "Close" : "Change"}
                  </button>
                </div>

                {showAvatarPicker ? (
                  <div className="border-t border-line/40 pb-2 pt-4">
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {CHESS_AVATAR_PIECES.map((piece) => {
                        const selected = piece === activePiece;
                        return (
                          <button
                            key={piece}
                            type="button"
                            disabled={savingAvatar}
                            onClick={() => void handleSaveAvatar(piece)}
                            className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 transition-colors cursor-pointer disabled:opacity-50 ${
                              selected
                                ? "border-ink bg-surface"
                                : "border-line/60 hover:border-line hover:bg-surface/50"
                            }`}
                          >
                            <ChessPieceIcon piece={piece} className="h-7 w-7" />
                            <span className="text-[10px] font-medium text-muted">
                              {CHESS_AVATAR_LABELS[piece]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="gp-account-cal-row">
                  <div>
                    <p className="gp-account-cal-row__label">Member since</p>
                    <p className="gp-account-cal-row__hint">
                      When you joined GetPGN.
                    </p>
                    <p className="mt-2 text-[14px] text-ink">
                      {memberSince}
                      <span className="text-muted"> · {planLabel} plan</span>
                    </p>
                  </div>
                  {isPro || isEnterprise || hasOrganizerWallet ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-paper">
                      <Sparkles className="h-3 w-3" aria-hidden="true" />
                      {planLabel}
                    </span>
                  ) : null}
                </div>
              </section>

              {showOrganizerTools ? (
                <>
                  <OrganizerCreditsPanel
                    wallet={organizerWallet}
                    showSubscriptionNote={isEnterprise || isPro}
                  />
                  <OrganizerLibraryPanel username={user.username} />
                </>
              ) : null}
            </div>
          ) : null}

          {tab === "security" ? (
            <form onSubmit={handleChangePassword} className="space-y-5">
              <IconInput
                id="account-current-password"
                label="Current password"
                type="password"
                icon={<Lock className="h-4 w-4" />}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                disabled={savingPassword}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <IconInput
                  id="account-new-password"
                  label="New password"
                  type="password"
                  icon={<KeyRound className="h-4 w-4" />}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={savingPassword}
                />
                <IconInput
                  id="account-confirm-password"
                  label="Confirm new password"
                  type="password"
                  icon={<KeyRound className="h-4 w-4" />}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={savingPassword}
                />
              </div>
              {(newPassword.length > 0 && newPassword.length < 6) ||
              (confirmPassword.length > 0 && newPassword !== confirmPassword) ? (
                <p className="text-[12px] text-warn flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {newPassword.length > 0 && newPassword.length < 6
                    ? "At least 6 characters."
                    : "Passwords don't match."}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={
                  savingPassword ||
                  !currentPassword ||
                  newPassword.length < 6 ||
                  newPassword !== confirmPassword
                }
                className="btn-primary btn-md"
              >
                {savingPassword ? <Spinner size={14} /> : null}
                Update password
              </button>
            </form>
          ) : null}

          {tab === "billing" ? (
            <div>
              {showUpgradeCta ? (
                <UsageBar
                  scanUsage={scanUsage}
                  onUpgrade={onUpgrade}
                  showUpgrade
                />
              ) : null}
              {billingPanel}
              {showUpgradeCta ? (
                <section className="gp-account-cal-section">
                  <div className="gp-account-cal-row">
                    <div className="min-w-0 flex-1">
                      <p className="gp-account-cal-row__label">GetPGN Pro</p>
                      <p className="gp-account-cal-row__hint">
                        ₹100/mo · 100 scans or ₹1,000/yr · 1,000 scans. Cloud
                        library and shareable replays.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onUpgrade}
                      className="gp-account-cal-row__action cursor-pointer"
                    >
                      View plans
                    </button>
                  </div>
                  <div className="pb-4 pt-2">
                    <FreeVsProTable
                      compact
                      onUpgrade={onUpgrade}
                      className="border-0 bg-transparent shadow-none"
                    />
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}

          {tab === "referrals" ? <ReferralPanel /> : null}
        </div>
      </div>
    </main>
  );
}

export default AccountScreen;
