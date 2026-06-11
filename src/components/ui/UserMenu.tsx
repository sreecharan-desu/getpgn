"use client";

import Link from "next/link";
import { Sparkles, User, ChevronRight, LogOut, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AvatarFrame } from "./AvatarFrame";
import { ChessPieceAvatar } from "./ChessPieceAvatar";

interface UserMenuProps {
  username: string;
  email?: string | null;
  avatarPiece?: string | null;
  isPro?: boolean;
  isEnterprise?: boolean;
  hasOrganizerWallet?: boolean;
  onAccount: () => void;
  onLogout: () => void;
}

export function UserMenu({
  username,
  email,
  avatarPiece,
  isPro,
  isEnterprise,
  hasOrganizerWallet,
  onAccount,
  onLogout,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group cursor-pointer rounded-full p-0.5 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/10 ${
          open ? "bg-surface-2" : ""
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${username}`}
        title={username}
      >
        <AvatarFrame isPro={isPro} isEnterprise={isEnterprise}>
          <ChessPieceAvatar
            piece={avatarPiece}
            username={username}
            size={34}
            isPro={isPro}
            className="transition-transform group-hover:scale-105"
          />
        </AvatarFrame>
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[min(15.5rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-paper py-1 shadow-[var(--shadow-soft)] gp-scale-in"
          role="menu"
        >
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <ChessPieceAvatar
              piece={avatarPiece}
              username={username}
              size={32}
              isPro={isPro}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-tight text-ink">
                {username}
              </p>
              {email ? (
                <p className="mt-0.5 truncate text-[11px] text-muted">{email}</p>
              ) : null}
            </div>
          </div>

          {isEnterprise || isPro || hasOrganizerWallet ? (
            <div className="px-3 pb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-paper">
                <Sparkles className="h-2.5 w-2.5" />
                {isEnterprise ? "Enterprise" : "Pro"}
              </span>
            </div>
          ) : null}

          <div className="border-t border-line/70 px-1 py-1">
            <Link
              href="/organizer"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink transition-colors hover:bg-surface-2"
            >
              <span className="inline-flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted" strokeWidth={1.75} />
                {hasOrganizerWallet ? "Scan credits" : "Buy scan credits"}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-2" />
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onAccount();
              }}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink transition-colors hover:bg-surface-2"
            >
              <span className="inline-flex items-center gap-2">
                <User className="h-4 w-4 text-muted" strokeWidth={1.75} />
                Account settings
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-2" />
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink transition-colors hover:bg-surface-2 md:hidden"
            >
              <LogOut className="h-4 w-4 text-muted" strokeWidth={1.75} />
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
