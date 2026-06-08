import React from "react";

interface AvatarFrameProps {
  isPro?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Pro members get a gradient ring + badge; free users render plain. */
export function AvatarFrame({ isPro, children, className = "" }: AvatarFrameProps) {
  if (!isPro) {
    return <span className={`inline-flex shrink-0 ${className}`}>{children}</span>;
  }

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <span
        className="rounded-full bg-[conic-gradient(from_210deg,var(--color-ink)_0%,var(--color-muted)_35%,var(--color-ink-soft)_70%,var(--color-ink)_100%)] p-[2.5px] shadow-[0_0_0_1px_var(--color-line-strong)]"
        aria-hidden
      >
        <span className="block rounded-full bg-paper p-[2px]">{children}</span>
      </span>
      <span
        className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border border-line-strong bg-ink text-paper shadow-[var(--shadow-soft)]"
        title="GetPGN Pro"
      >
        <span className="text-[8px] font-bold leading-none">P</span>
      </span>
    </span>
  );
}
