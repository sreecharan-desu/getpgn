"use client";

import React, { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { parseMetadataFromPgn } from "@/lib/playerNames";

interface ScanLeaveDialogProps {
  open: boolean;
  pgn: string;
  saving: boolean;
  discarding: boolean;
  onSave: (input: {
    title: string;
    whitePlayer: string;
    blackPlayer: string;
  }) => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function ScanLeaveDialog({
  open,
  pgn,
  saving,
  discarding,
  onSave,
  onDiscard,
  onCancel,
}: ScanLeaveDialogProps) {
  const [title, setTitle] = useState("");
  const [whitePlayer, setWhitePlayer] = useState("");
  const [blackPlayer, setBlackPlayer] = useState("");

  useEffect(() => {
    if (!open) return;
    const meta = parseMetadataFromPgn(pgn);
    setTitle(meta.title);
    setWhitePlayer(meta.whitePlayer);
    setBlackPlayer(meta.blackPlayer);
  }, [open, pgn]);

  if (!open) return null;

  const busy = saving || discarding;
  const canSave =
    title.trim().length > 0 &&
    whitePlayer.trim().length > 0 &&
    blackPlayer.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-leave-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-5 shadow-[var(--shadow-pop)]">
        <h2
          id="scan-leave-title"
          className="text-[17px] font-semibold tracking-tight text-ink"
        >
          Save this game?
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          A public share link is already live. Save to keep this game in your
          library, or discard to remove the game and link.
        </p>

        <div className="mt-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={whitePlayer}
              onChange={(e) => setWhitePlayer(e.target.value)}
              className="input"
              placeholder="White player"
              aria-label="White player"
              disabled={busy}
            />
            <input
              type="text"
              value={blackPlayer}
              onChange={(e) => setBlackPlayer(e.target.value)}
              className="input"
              placeholder="Black player"
              aria-label="Black player"
              disabled={busy}
            />
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="Game title"
            aria-label="Game title"
            disabled={busy}
          />
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn-secondary btn-md"
          >
            Keep reviewing
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={busy}
            className="btn-secondary btn-md text-danger hover:border-danger hover:bg-danger-bg hover:text-danger"
          >
            {discarding ? (
              <>
                <Spinner size={14} /> Discarding…
              </>
            ) : (
              "Discard"
            )}
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                title: title.trim(),
                whitePlayer: whitePlayer.trim(),
                blackPlayer: blackPlayer.trim(),
              })
            }
            disabled={busy || !canSave}
            className="btn-primary btn-md"
          >
            {saving ? (
              <>
                <Spinner size={14} /> Saving…
              </>
            ) : (
              "Save to library"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
