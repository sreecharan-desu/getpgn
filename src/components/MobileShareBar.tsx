"use client";

import React, { useState } from "react";
import { Check, Link2, Lock } from "lucide-react";
import { SiLichess, SiChessdotcom } from "react-icons/si";
import { toast } from "sonner";

interface MobileShareBarProps {
  pgn: string;
  isPaid: boolean;
  gameId: string | null;
  sharedSlug: string | null;
  onShare?: (gameId: string) => Promise<string | null>;
}

export const MobileShareBar: React.FC<MobileShareBarProps> = ({
  pgn,
  isPaid,
  gameId,
  sharedSlug,
  onShare,
}) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const shareUrl = sharedSlug
    ? `${window.location.origin}/share/${sharedSlug}`
    : "";

  const handleCopyShareLink = async () => {
    if (!isPaid) {
      toast.info("Upgrade to Pro to share interactive replays.");
      return;
    }

    let slug = sharedSlug;
    if (!slug && gameId && onShare) {
      setSharing(true);
      slug = await onShare(gameId);
      setSharing(false);
      if (!slug) return;
    }

    if (!slug) {
      toast.info("Save the game first to generate a share link.");
      return;
    }

    const url = `${window.location.origin}/share/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast.success("Share link copied");
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  const openLichess = () => {
    if (!pgn) return;
    window.open(
      `https://lichess.org/analysis/pgn/${encodeURIComponent(pgn)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const openChessCom = () => {
    if (!pgn) return;
    window.open(
      `https://www.chess.com/analysis?pgn=${encodeURIComponent(pgn)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-[12px] border border-line bg-surface px-3 py-2 lg:hidden">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-2">
        Share
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleCopyShareLink}
          disabled={sharing || !pgn}
          title={
            isPaid
              ? sharedSlug
                ? "Copy public share link"
                : "Generate and copy share link"
              : "Share link (Pro)"
          }
          className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line-strong bg-paper text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          {!isPaid ? (
            <Lock className="h-4 w-4" aria-hidden="true" />
          ) : linkCopied ? (
            <Check className="h-4 w-4 text-positive" aria-hidden="true" />
          ) : (
            <Link2 className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sr-only">Copy public share link</span>
        </button>
        <button
          type="button"
          onClick={openLichess}
          disabled={!pgn}
          title="Open in Lichess"
          className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line-strong bg-paper text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SiLichess className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Open in Lichess</span>
        </button>
        <button
          type="button"
          onClick={openChessCom}
          disabled={!pgn}
          title="Open in Chess.com"
          className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line-strong bg-paper text-muted transition-colors hover:border-[var(--color-positive)] hover:text-positive disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SiChessdotcom className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Open in Chess.com</span>
        </button>
      </div>
      {shareUrl ? (
        <span className="sr-only">Share link active: {shareUrl}</span>
      ) : null}
    </div>
  );
};
