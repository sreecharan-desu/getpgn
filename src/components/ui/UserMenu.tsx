"use client";

import { Sparkles, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useThemeToggle } from "@/hooks/useThemeToggle";
import { AvatarFrame } from "./AvatarFrame";
import { UserAvatar } from "./UserAvatar";

interface UserMenuProps {
  username: string;
  email?: string | null;
  isPro?: boolean;
  onAccount: () => void;
}

export function UserMenu({ username, email, isPro, onAccount }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { toggleTheme, label, Icon } = useThemeToggle();

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
        <AvatarFrame isPro={isPro}>
          <UserAvatar
            name={username}
            size={34}
            className="transition-transform group-hover:scale-105"
          />
        </AvatarFrame>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[min(17rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line/70 bg-paper py-1.5 shadow-[var(--shadow-pop)] gp-scale-in"
          role="menu"
        >
          <div className="border-b border-line/70 px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <UserAvatar name={username} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">
                  {username}
                </p>
                {email ? (
                  <p className="mt-0.5 truncate text-[11px] text-muted">
                    {email}
                  </p>
                ) : null}
                {isPro ? (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-paper">
                    <Sparkles className="h-2.5 w-2.5" />
                    Pro
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="px-1.5 py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onAccount();
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-surface-2"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-surface text-muted">
                <User className="h-4 w-4" />
              </span>
              Account settings
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
              title={label}
              aria-label={label}
            >
              <span className="text-[13px] text-ink">Appearance</span>
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-surface text-muted"
                aria-hidden="true"
              >
                <Icon className="h-[17px] w-[17px]" />
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
