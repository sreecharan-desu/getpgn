"use client";

import React, { useState } from "react";
import { Check, Copy, Download, Link2, Lock, Save } from "lucide-react";
import { SiLichess, SiChessdotcom } from "react-icons/si";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/Spinner";

interface MobileShareBarProps {
  variant?: "dashboard" | "public";
  pgn: string;
  isPaid?: boolean;
  gameId?: string | null;
  sharedSlug?: string | null;
  downloadFileName?: string;
  onSave?: (title: string) => Promise<string | null>;
  onShare?: (gameId: string) => Promise<string | null>;
}

const actionBtnClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-line-strong bg-paper text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

export const MobileShareBar: React.FC<MobileShareBarProps> = ({
  variant = "dashboard",
  pgn,
  isPaid = false,
  gameId = null,
  sharedSlug = null,
  downloadFileName,
  onSave,
  onShare,
}) => {
  const isPublic = variant === "public";
  const [linkCopied, setLinkCopied] = useState(false);
  const [pgnCopied, setPgnCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);

  const shareUrl = sharedSlug
    ? `${window.location.origin}/share/${sharedSlug}`
    : "";

  const handleSave = async () => {
    if (!isPaid) {
      toast.info("Upgrade to Pro to save games to your library.");
      return;
    }
    if (gameId) {
      toast.info("Game already saved.");
      return;
    }
    if (!onSave || !pgn) return;

    setSaving(true);
    try {
      const title = `Scanned Game - ${new Date().toLocaleDateString("en-CA")}`;
      await onSave(title);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPgn = async () => {
    if (!pgn) return;
    try {
      await navigator.clipboard.writeText(pgn);
      setPgnCopied(true);
      setTimeout(() => setPgnCopied(false), 2000);
      toast.success("PGN copied");
    } catch {
      toast.error("Could not copy PGN.");
    }
  };

  const handleDownloadPgn = () => {
    if (!pgn) return;
    const blob = new Blob([pgn], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      downloadFileName ?? `game_${new Date().toISOString().slice(0, 10)}.pgn`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("PGN downloaded");
  };

  const handleCopyShareLink = async () => {
    if (isPublic) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
        toast.success("Share link copied");
      } catch {
        toast.error("Could not copy the link.");
      }
      return;
    }

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
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-2">
        Share
      </span>
      <div className="flex min-w-0 items-center justify-end gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {!isPublic ? (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !pgn}
            aria-busy={saving || undefined}
            title={
              saving
                ? "Saving…"
                : isPaid
                  ? gameId
                    ? "Saved to library"
                    : "Save game"
                  : "Save (Pro)"
            }
            className={actionBtnClass}
          >
            {saving ? (
              <Spinner size={16} />
            ) : !isPaid ? (
              <Lock className="h-4 w-4" aria-hidden="true" />
            ) : gameId ? (
              <Check className="h-4 w-4 text-positive" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="sr-only">
              {saving ? "Saving game" : "Save game"}
            </span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleCopyPgn}
          disabled={!pgn}
          title="Copy PGN"
          className={actionBtnClass}
        >
          {pgnCopied ? (
            <Check className="h-4 w-4 text-positive" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sr-only">Copy PGN</span>
        </button>
        <button
          type="button"
          onClick={handleDownloadPgn}
          disabled={!pgn}
          title="Download PGN"
          className={actionBtnClass}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Download PGN</span>
        </button>
        <button
          type="button"
          onClick={handleCopyShareLink}
          disabled={sharing || !pgn}
          title={
            isPublic
              ? "Copy share link"
              : isPaid
                ? sharedSlug
                  ? "Copy public share link"
                  : "Generate and copy share link"
                : "Share link (Pro)"
          }
          className={actionBtnClass}
        >
          {!isPublic && !isPaid ? (
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
          className={actionBtnClass}
        >
          <SiLichess className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Open in Lichess</span>
        </button>
        <button
          type="button"
          onClick={openChessCom}
          disabled={!pgn}
          title="Open in Chess.com"
          className={`${actionBtnClass} hover:border-[var(--color-positive)] hover:text-positive`}
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
