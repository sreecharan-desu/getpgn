"use client";

import React, { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

export interface GameMetadataValues {
  title: string;
  whitePlayer: string;
  blackPlayer: string;
}

interface GameMetadataEditDialogProps {
  open: boolean;
  initial: GameMetadataValues;
  saving?: boolean;
  onSave: (values: GameMetadataValues) => void;
  onClose: () => void;
}

export function GameMetadataEditDialog({
  open,
  initial,
  saving = false,
  onSave,
  onClose,
}: GameMetadataEditDialogProps) {
  const [title, setTitle] = useState(initial.title);
  const [whitePlayer, setWhitePlayer] = useState(initial.whitePlayer);
  const [blackPlayer, setBlackPlayer] = useState(initial.blackPlayer);

  useEffect(() => {
    if (!open) return;
    setTitle(initial.title);
    setWhitePlayer(initial.whitePlayer);
    setBlackPlayer(initial.blackPlayer);
  }, [open, initial]);

  if (!open) return null;

  const canSave =
    title.trim().length > 0 &&
    whitePlayer.trim().length > 0 &&
    blackPlayer.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-meta-edit-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-paper p-5 shadow-[var(--shadow-pop)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="game-meta-edit-title"
          className="text-[17px] font-semibold tracking-tight text-ink"
        >
          Edit game details
        </h2>
        <p className="mt-1.5 text-[13px] text-muted">
          Update the title and player names shown on the board.
        </p>

        <div className="mt-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-2">
                White
              </span>
              <input
                type="text"
                value={whitePlayer}
                onChange={(e) => setWhitePlayer(e.target.value)}
                className="input"
                placeholder="Player 1"
                disabled={saving}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-2">
                Black
              </span>
              <input
                type="text"
                value={blackPlayer}
                onChange={(e) => setBlackPlayer(e.target.value)}
                className="input"
                placeholder="Player 2"
                disabled={saving}
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-2">
              Game title
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Game title"
              disabled={saving}
            />
          </label>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-secondary btn-md"
          >
            Cancel
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
            disabled={saving || !canSave}
            className="btn-primary btn-md"
          >
            {saving ? (
              <>
                <Spinner size={14} /> Saving…
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
